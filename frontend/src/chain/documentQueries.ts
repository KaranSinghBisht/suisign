// frontend/src/chain/documentQueries.ts
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

export type ChainSignature = {
  signer: string;
  timestampMs: number;
};

export type ChainDocument = {
  id: string;
  owner: string;
  walrusBlobId?: string;
  walrusHashHex?: string;
  sealSecretId?: string;
  fullySigned: boolean;
  signers: string[];
  signatures: ChainSignature[];
};

const NETWORKS: Array<"devnet" | "testnet" | "mainnet"> = [
  "testnet",
  "devnet",
  "mainnet",
];

function decodeChainString(raw: any): string | undefined {
  if (raw === null || raw === undefined) return undefined;

  if (typeof raw === "string") {
    if (/^\d+(,\d+)+$/.test(raw.trim())) {
      const nums = raw.split(",").map((n) => Number(n.trim()));
      if (nums.every((n) => Number.isFinite(n))) {
        return String.fromCharCode(...nums);
      }
    }
    return raw;
  }

  if (Array.isArray(raw)) {
    const nums = raw.map((n) => Number(n));
    if (nums.every((n) => Number.isFinite(n))) {
      return String.fromCharCode(...nums);
    }
  }

  return String(raw);
}

function parseChainDocument(raw: any): ChainDocument | null {
  const content = raw?.data?.content;
  if (!content || content.dataType !== "moveObject") return null;

  const type = content.type as string;
  if (!type || !type.includes("::document::Document")) return null;

  const fields = content.fields as any;
  if (!fields) return null;

  const signers: string[] = Array.isArray(fields.signers)
    ? fields.signers.map((s: any) => String(s).toLowerCase())
    : [];

  const signaturesRaw: any[] = Array.isArray(fields.signatures)
    ? fields.signatures
    : [];

  const signatures: ChainSignature[] = signaturesRaw
    .map((s) => {
      let signer: string;

      if (typeof s === "string") {
        signer = s.toLowerCase();
      } else if (s && typeof s.signer === "string") {
        signer = s.signer.toLowerCase();
      } else {
        signer = "";
      }

      const timestampMs =
        s && typeof s === "object" && "timestamp_ms" in s
          ? Number((s as any).timestamp_ms ?? 0)
          : 0;

      return { signer, timestampMs };
    })
    .filter((sig) => sig.signer && sig.signer.startsWith("0x"));

  const fullySigned = Boolean(fields.fully_signed);

  const walrusBlobId =
    fields.walrus_blob_id !== undefined && fields.walrus_blob_id !== null
      ? decodeChainString(fields.walrus_blob_id)
      : undefined;
  const walrusHashHex =
    fields.walrus_hash_hex !== undefined && fields.walrus_hash_hex !== null
      ? decodeChainString(fields.walrus_hash_hex)
      : undefined;
  const sealSecretId =
    fields.seal_secret_id !== undefined && fields.seal_secret_id !== null
      ? decodeChainString(fields.seal_secret_id)
      : undefined;

  return {
    id: String(raw.data?.objectId ?? ""),
    owner: String(fields.owner ?? ""),
    walrusBlobId,
    walrusHashHex,
    sealSecretId,
    fullySigned,
    signers,
    signatures,
  };
}

export async function fetchDocumentFromChain(
  objectId: string,
): Promise<ChainDocument | null> {
  if (!objectId || !objectId.startsWith("0x")) return null;

  for (const net of NETWORKS) {
    const client = new SuiClient({ url: getFullnodeUrl(net) });
    try {
      const resp = await client.getObject({
        id: objectId,
        options: { showContent: true },
      });

      const doc = parseChainDocument(resp);
      if (doc) {
        console.log("[SuiSign] fetched on-chain document from", net, doc);
        return doc;
      }
    } catch (e: any) {
      console.warn(
        `[SuiSign] fetchDocumentFromChain failed on ${net}:`,
        e?.message ?? e,
      );
    }
  }

  return null;
}
