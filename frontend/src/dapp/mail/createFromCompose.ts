// /frontend/src/dapp/mail/createFromCompose.ts
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { resolveHandlesOrAddresses } from "../../handleRegistry";
import { encryptMessageAndUploadToWalrus } from "../../cryptoHelpers";
import type { StoredDocMetadata } from "../../storage";

const PACKAGE_ID = import.meta.env.VITE_SUISIGN_PACKAGE_ID as string;
const DEFAULT_SEAL_KEY_ID = "compose-auto";

type SignAndExecuteFn = (args: {
  transaction: Transaction;
  options?: any;
}) => Promise<any>;

type CreateComposeInput = {
  subject: string;
  message: string;
  signerInput: string;
  senderAddress: string;
  signAndExecute: SignAndExecuteFn;
};

// --- helper: fetch tx details from a fullnode using the digest --- //

async function fetchTxWithDetails(digest: string): Promise<any | null> {
  // Try devnet → testnet → mainnet until one has the tx.
  const networks: Array<"devnet" | "testnet" | "mainnet"> = [
    "devnet",
    "testnet",
    "mainnet",
  ];

  for (const net of networks) {
    const client = new SuiClient({ url: getFullnodeUrl(net) });
    try {
      const resp = await client.getTransactionBlock({
        digest,
        options: { showEffects: true, showObjectChanges: true },
      });
      console.log("[SuiSign] fetched tx from", net);
      return resp;
    } catch (e: any) {
      console.warn(
        `[SuiSign] getTransactionBlock failed on ${net}:`,
        e?.message ?? e,
      );
    }
  }

  return null;
}

// --- helper: extract created document::Document id from a tx response --- //

function extractDocumentId(result: any): string {
  if (!result || typeof result !== "object") return "";

  const documentIds = new Set<string>();
  const anyCreatedIds = new Set<string>();

  function recordId(node: any, targetSet: Set<string>) {
    if (!node || typeof node !== "object") return;
    const oid: unknown =
      node.objectId ??
      node.reference?.objectId ??
      node.id ??
      node.object_id; // super defensive

    if (typeof oid === "string" && oid.startsWith("0x")) {
      targetSet.add(oid);
    }
  }

  function visit(node: any) {
    if (!node || typeof node !== "object") return;

    const objectType: string | undefined =
      node.objectType ??
      node.reference?.objectType ??
      node.type; // some shapes put type in here

    const changeType: string | undefined = node.type;

    if (changeType === "created") {
      // track every created object
      recordId(node, anyCreatedIds);

      // and specifically track document::Document creations
      if (
        typeof objectType === "string" &&
        objectType.includes("::document::Document")
      ) {
        recordId(node, documentIds);
      }
    }

    if (Array.isArray(node)) {
      for (const item of node) visit(item);
    } else {
      for (const value of Object.values(node)) {
        if (value && typeof value === "object") visit(value);
      }
    }
  }

  // Walk whole response for anything interesting
  visit(result);

  // Extra explicit passes over the common Sui fields
  const createdEffects = (result?.effects?.created ?? []) as any[];
  for (const c of createdEffects) {
    recordId(c, anyCreatedIds);
    const ty: string | undefined =
      c.objectType ?? c.reference?.objectType ?? c.type;
    if (typeof ty === "string" && ty.includes("::document::Document")) {
      recordId(c, documentIds);
    }
  }

  const objectChanges = (result?.objectChanges ?? []) as any[];
  for (const c of objectChanges) {
    if (c?.type === "created") {
      const ty: string | undefined = c.objectType;
      if (typeof ty === "string" && ty.includes("::document::Document")) {
        recordId(c, documentIds);
      } else {
        recordId(c, anyCreatedIds);
      }
    }
  }

  // Prefer a document-specific id; otherwise fall back to “any created object”
  const docId = Array.from(documentIds)[0];
  if (docId) return docId;

  const fallbackId = Array.from(anyCreatedIds)[0];
  return fallbackId ?? "";
}

// --- main entry point --- //

export async function createDocumentFromCompose(
  input: CreateComposeInput,
): Promise<StoredDocMetadata> {
  const rawPieces = input.signerInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!rawPieces.length) {
    throw new Error("At least one signer is required");
  }

  // First pass: use handle registry resolver
  let signerAddresses = resolveHandlesOrAddresses(rawPieces);

  const senderAddrLower = input.senderAddress.toLowerCase();

  // Fallback: if nothing resolved, accept direct sender address if entered
  if (!signerAddresses.length) {
    for (const raw of rawPieces) {
      const v = raw.trim().toLowerCase();
      if (v === senderAddrLower) {
        signerAddresses.push(senderAddrLower);
      }
    }
  }

  console.log("[SuiSign] signerInput", rawPieces, "resolved", signerAddresses);

  if (!signerAddresses.length) {
    throw new Error(
      "Could not resolve any valid signer addresses. Use a 0x... address or a registered handle.",
    );
  }

  const encrypted = await encryptMessageAndUploadToWalrus({
    subject: input.subject,
    message: input.message,
    senderAddress: input.senderAddress,
  });

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::document::create_document`,
    arguments: [
      tx.pure.string(encrypted.blobId),
      tx.pure.string(encrypted.hashHex),
      tx.pure.string(DEFAULT_SEAL_KEY_ID),
      tx.pure.vector("address", signerAddresses),
    ],
  });

  // 1) send tx via wallet
  const rawResult = await input.signAndExecute({
    transaction: tx,
    options: { showObjectChanges: true, showEffects: true },
  });

  console.log("[SuiSign] create_document raw wallet result:", rawResult);

  // 2) ask a fullnode for full details so we can see created objects
  let createdObjectId = "";
  if (rawResult && typeof rawResult.digest === "string") {
    const txDetails = await fetchTxWithDetails(rawResult.digest);
    console.log("[SuiSign] fetched tx details:", txDetails);
    if (txDetails) {
      createdObjectId = extractDocumentId(txDetails);
    }
  } else {
    console.warn(
      "[SuiSign] Wallet result did not include a digest; cannot fetch tx details.",
    );
  }

  if (!createdObjectId) {
    console.warn(
      "[SuiSign] Could not find created Document objectId; " +
        "doc will be stored as local-only (cannot be signed).",
    );
  } else {
    console.log("[SuiSign] Created Document objectId:", createdObjectId);
  }

  return {
    objectId: createdObjectId || "",
    blobId: encrypted.blobId,
    hashHex: encrypted.hashHex,
    ivB64: encrypted.ivB64,
    keyB64: encrypted.keyB64,
    subject: input.subject,
    message: input.message,
    createdAt: new Date().toISOString(),
    signers: signerAddresses,
    signedAddresses: [],
    senderAddress: input.senderAddress.toLowerCase(),
  };
}
