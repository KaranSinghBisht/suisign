// frontend/src/sealClient.ts
// Seal integration for SuiSign: envelope-encrypt AES key+IV and gate it via on-chain policy.

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromHEX } from "@mysten/sui/utils";
import { SealClient, SessionKey, EncryptedObject } from "@mysten/seal";
import { toBase64, fromBase64 } from "./cryptoHelpers";

export type CreateSealSecretInput = {
  docIdHint?: string;
  keyB64: string;
  ivB64: string;
  allowedAddresses: string[]; // owner + all signers (lowercased)
};

export type SealSecretPayload = {
  keyB64: string;
  ivB64: string;
};

const SUISIGN_PACKAGE_ID = import.meta.env
  .VITE_SUISIGN_PACKAGE_ID as string;

// Not used yet, but keep for future on-chain decrypt.
const SEAL_PACKAGE_ID = import.meta.env.VITE_SEAL_PACKAGE_ID as string | undefined;

// Comma-separated Seal key server object IDs (0x... addresses)
const SEAL_SERVER_IDS: string[] = (import.meta.env.VITE_SEAL_SERVER_IDS || "")
  .split(",")
  .map((s: string) => s.trim())
  .filter((s: string) => s.length > 0);

const SUI_RPC_URL = getFullnodeUrl("testnet");

// ---- singletons ----

let suiClient: SuiClient | null = null;
let sealClient: SealClient | null = null;

let currentSessionKey: SessionKey | null = null;
let currentSessionAddress: string | null = null;
let sessionInitPromise: Promise<SessionKey> | null = null;

function getSuiClient(): SuiClient {
  if (!suiClient) {
    suiClient = new SuiClient({ url: SUI_RPC_URL });
  }
  return suiClient;
}

async function getSealClient(): Promise<SealClient> {
  if (!sealClient) {
    if (!SEAL_SERVER_IDS.length) {
      throw new Error(
        "Seal misconfigured: VITE_SEAL_SERVER_IDS is empty. Set it to a comma-separated list of Seal key server object IDs.",
      );
    }

    const client = getSuiClient();
    sealClient = new SealClient({
      suiClient: client,
      serverConfigs: SEAL_SERVER_IDS.map((id: string) => ({
        objectId: id,
        weight: 1,
      })),
      // You can flip this to true later if you want key-server verification.
      verifyKeyServers: false,
    });
  }
  return sealClient!;
}

// Called when wallet changes.
export function resetSealSessionForAddress(address: string | null) {
  currentSessionAddress = address ? address.toLowerCase() : null;
  currentSessionKey = null;
  sessionInitPromise = null;
}

async function ensureSessionKey(
  signPersonalMessage: (msg: Uint8Array) => Promise<string>,
): Promise<SessionKey> {
  if (!currentSessionAddress) {
    throw new Error("No active wallet for Seal session");
  }

  if (currentSessionKey) return currentSessionKey;
  if (sessionInitPromise) return sessionInitPromise;

  sessionInitPromise = (async () => {
    const sk = await SessionKey.create({
      address: currentSessionAddress,
      packageId: SUISIGN_PACKAGE_ID,
      ttlMin: 10,
      suiClient: getSuiClient(),
    });

    const message = sk.getPersonalMessage();
    const signature = await signPersonalMessage(message);
    sk.setPersonalMessageSignature(signature);

    currentSessionKey = sk;
    return sk;
  })();

  try {
    return await sessionInitPromise;
  } finally {
    sessionInitPromise = null;
  }
}

function randomPolicyIdHex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  // Turn random bytes into a hex string without 0x
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeHexIdentity(raw?: string | null): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withoutPrefix = trimmed.replace(/^0x/i, "");

  if (!/^[0-9a-fA-F]+$/.test(withoutPrefix)) {
    console.warn(
      "[SuiSign] createSealSecretForDoc: ignoring non-hex docIdHint:",
      raw,
    );
    return null;
  }

  return withoutPrefix.toLowerCase();
}

// Build PTB for `suisign::document::seal_approve`
async function buildSealApproveTxBytes(
  docObjectId: string,
  encryptedBytes: Uint8Array,
): Promise<Uint8Array> {
  const client = getSuiClient();
  const encryptedObject = EncryptedObject.parse(encryptedBytes);

  // encryptedObject.id is a hex string *without* 0x.
  const idBytes = fromHEX(encryptedObject.id);

  const tx = new Transaction();
  tx.moveCall({
    target: `${SUISIGN_PACKAGE_ID}::document::seal_approve`,
    arguments: [
      tx.pure.vector("u8", idBytes),
      tx.object(docObjectId),
    ],
  });

  return await tx.build({
    client,
    onlyTransactionKind: true,
  });
}

// ---------- PUBLIC API ----------

// Encrypt AES key+IV with Seal; return base64(serialized EncryptedObject)
export async function createSealSecretForDoc(
  input: CreateSealSecretInput,
): Promise<string> {
  const client = await getSealClient();

  const payload = JSON.stringify({
    keyB64: input.keyB64,
    ivB64: input.ivB64,
  });

  const data = new TextEncoder().encode(payload);

  const hinted = sanitizeHexIdentity(input.docIdHint);
  const policyIdHex = hinted ?? randomPolicyIdHex();

  const { encryptedObject: encryptedBytes } = await client.encrypt({
    threshold: 1,
    packageId: SUISIGN_PACKAGE_ID,
    id: policyIdHex, // hex string (no 0x)
    data,
  });

  return toBase64(encryptedBytes);
}

// Decrypt AES key+IV for a given Document object.
export async function readSealSecretForDoc(
  docObjectId: string,
  sealSecretB64: string,
  opts: {
    signPersonalMessage: (msg: Uint8Array) => Promise<string>;
  },
): Promise<SealSecretPayload> {
  if (!sealSecretB64) {
    throw new Error("Document has no Seal secret payload");
  }

  if (!docObjectId || !docObjectId.startsWith("0x")) {
    throw new Error("Cannot decrypt: document has no on-chain object id");
  }

  const client = await getSealClient();
  const sessionKey = await ensureSessionKey(opts.signPersonalMessage);

  const encryptedBytes = fromBase64(sealSecretB64);
  const txBytes = await buildSealApproveTxBytes(docObjectId, encryptedBytes);

  const decryptedBytes = await client.decrypt({
    data: encryptedBytes,
    sessionKey,
    txBytes,
  });

  const json = new TextDecoder().decode(decryptedBytes);
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Seal decrypted payload is not valid JSON");
  }

  if (!parsed.keyB64 || !parsed.ivB64) {
    throw new Error("Seal payload missing keyB64/ivB64");
  }

  return {
    keyB64: String(parsed.keyB64),
    ivB64: String(parsed.ivB64),
  };
}
