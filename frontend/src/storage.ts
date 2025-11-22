// /frontend/src/storage.ts
// Walrus HTTP client wrappers + local doc metadata store.

import { walrusStoreBlob, walrusReadBlob } from "./walrusClient";
import { toBase64, fromBase64 } from "./cryptoHelpers";
import type { DocumentMetadata, DocumentKind } from "./dapp/mail/types";

/* ---------- Walrus blob storage ---------- */

export type StoredWalrusBlobMeta = {
  blobId: string;
  objectId?: string;
};

const WALRUS_META_KEY = "suisign_walrus_meta_v1";

function loadWalrusMetaMap(): Record<string, StoredWalrusBlobMeta> {
  try {
    const raw = localStorage.getItem(WALRUS_META_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredWalrusBlobMeta>;
  } catch {
    return {};
  }
}

function saveWalrusMetaMap(map: Record<string, StoredWalrusBlobMeta>) {
  localStorage.setItem(WALRUS_META_KEY, JSON.stringify(map));
}

/**
 * Upload encrypted ciphertext to Walrus and return IDs.
 * `cipherB64` is base64 of the AES ciphertext.
 */
export async function storeEncryptedBlobToWalrus(options: {
  cipherB64: string;
  epochs?: number;
}): Promise<StoredWalrusBlobMeta> {
  const bytes = fromBase64(options.cipherB64);

  const result = await walrusStoreBlob(bytes, {
    epochs: options.epochs ?? 1,
    permanent: true,
  });

  const meta: StoredWalrusBlobMeta = {
    blobId: result.blobId,
    objectId: result.objectId,
  };

  const map = loadWalrusMetaMap();
  map[meta.blobId] = meta;
  saveWalrusMetaMap(map);

  return meta;
}

/**
 * Fetch ciphertext from Walrus by blobId, return in the same shape as before.
 */
export async function fetchEncryptedBlob(blobId: string): Promise<{
  cipherB64: string;
}> {
  const bytes = await walrusReadBlob(blobId);
  return {
    cipherB64: toBase64(bytes),
  };
}

/* ---------- Local doc metadata storage ---------- */

export type StoredDocStatus = "pending" | "signed" | "completed";

export type StoredDocMetadata = {
  objectId: string;   // on-chain Document id (0x...) or "" if unknown
  blobId: string;     // Walrus blob id
  walrusBlobObjectId?: string; // optional Sui blob object id from Walrus
  hashHex: string;
  messagePreview?: string;
  ivB64?: string;
  keyB64?: string;
  sealSecretId?: string;
  subject: string;
  message?: string;
  createdAt: string;
  signers?: string[];
  status?: StoredDocStatus;
  signedAddresses?: string[];
  senderAddress?: string;
  requiresHandSignature?: boolean;

  // Content metadata
  contentKind?: "message" | "file";
  fileName?: string;
  mimeType?: string;
  metadata?: DocumentMetadata;
};

const DOCS_KEY_PREFIX = "suisign_docs_";
const LAST_CREATED_KEY = "suisign_last_created";

function safeParseDocs(raw: string | null): StoredDocMetadata[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredDocMetadata[]) : [];
  } catch {
    return [];
  }
}

export function loadDocsForAddress(address: string): StoredDocMetadata[] {
  if (!address) return [];

  const key = `${DOCS_KEY_PREFIX}${address}`;
  const list = safeParseDocs(localStorage.getItem(key));

  // newest first
  return [...list].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });
}

export function saveDocForAddress(
  address: string,
  doc: StoredDocMetadata,
): void {
  if (!address) return;

  const key = `${DOCS_KEY_PREFIX}${address}`;
  const existing = loadDocsForAddress(address);

  const docKey =
    doc.blobId || doc.objectId || `local-${Date.now().toString(16)}`;

  const derivedKind: DocumentKind =
    doc.metadata?.kind ??
    (doc.contentKind === "file" || doc.mimeType
      ? "pdf"
      : "richtext");

  const normalizedMetadata: DocumentMetadata = {
    kind: derivedKind,
    subject: doc.metadata?.subject ?? doc.subject ?? "",
    walrusBlobId: doc.metadata?.walrusBlobId ?? doc.blobId ?? "",
    requiresHandSignature:
      doc.metadata?.requiresHandSignature ?? doc.requiresHandSignature ?? false,
    localSignatures: doc.metadata?.localSignatures,
  };

  // remove any prior entry with same blobId/objectId
  const filtered = existing.filter(
    (d) => (d.blobId || d.objectId) !== docKey,
  );

  const normalized: StoredDocMetadata = {
    objectId: doc.objectId ?? "",
    blobId: doc.blobId ?? docKey,
    walrusBlobObjectId: doc.walrusBlobObjectId,
    hashHex: doc.hashHex ?? "",
    ivB64: doc.ivB64 ?? "",
    keyB64: doc.keyB64 ?? "",
    sealSecretId: doc.sealSecretId ?? "",
    subject: doc.subject ?? "",
    message: doc.message ?? "",
    messagePreview: doc.messagePreview ?? doc.message ?? "",
    createdAt: doc.createdAt ?? new Date().toISOString(),
    signers: doc.signers ?? [],
    status: doc.status ?? "pending",
    signedAddresses: doc.signedAddresses ?? [],
    senderAddress: doc.senderAddress ? doc.senderAddress.toLowerCase() : "",
    requiresHandSignature:
      doc.requiresHandSignature ??
      doc.metadata?.requiresHandSignature ??
      false,

    contentKind: doc.contentKind ?? (doc.mimeType ? "file" : "message"),
    fileName: doc.fileName ?? "",
    mimeType: doc.mimeType ?? "",
    metadata: normalizedMetadata,
  };

  filtered.push(normalized);

  // newest first
  filtered.sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });

  localStorage.setItem(key, JSON.stringify(filtered));
  localStorage.setItem(LAST_CREATED_KEY, JSON.stringify(normalized));
}

export function loadLastCreatedDoc(): StoredDocMetadata | null {
  const raw = localStorage.getItem(LAST_CREATED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredDocMetadata;
  } catch {
    return null;
  }
}

export function updateDocStatusForAddress(
  address: string,
  docId: string,
  status: StoredDocStatus,
): void {
  if (!address || !docId) return;

  const key = `${DOCS_KEY_PREFIX}${address}`;
  const list = loadDocsForAddress(address);
  if (!list.length) return;

  const updated = list.map((d) =>
    d.objectId === docId || d.blobId === docId ? { ...d, status } : d,
  );

  localStorage.setItem(key, JSON.stringify(updated));

  const last = loadLastCreatedDoc();
  if (last && (last.objectId === docId || last.blobId === docId)) {
    localStorage.setItem(
      LAST_CREATED_KEY,
      JSON.stringify({ ...last, status }),
    );
  }
}

export function updateDocSignedAddressesForAddress(
  address: string,
  docId: string,
  signedAddresses: string[],
): void {
  if (!address || !docId) return;

  const key = `${DOCS_KEY_PREFIX}${address}`;
  const list = loadDocsForAddress(address);
  if (!list.length) return;

  const updated = list.map((d) =>
    d.objectId === docId || d.blobId === docId
      ? { ...d, signedAddresses }
      : d,
  );

  localStorage.setItem(key, JSON.stringify(updated));

  const last = loadLastCreatedDoc();
  if (last && (last.objectId === docId || last.blobId === docId)) {
    localStorage.setItem(
      LAST_CREATED_KEY,
      JSON.stringify({ ...last, signedAddresses }),
    );
  }
}

export function updateDocBlobForAddress(
  address: string,
  docId: string,
  newBlobId: string,
  newHashHex?: string,
): void {
  if (!address || !docId) return;

  const key = `${DOCS_KEY_PREFIX}${address}`;
  const list = loadDocsForAddress(address);
  if (!list.length) return;

  const updated = list.map((d) => {
    if (d.objectId === docId || d.blobId === docId) {
      const updatedMeta: DocumentMetadata = {
        ...(d.metadata ?? {
          kind: "pdf",
          subject: d.subject ?? "",
          walrusBlobId: d.blobId,
        }),
        walrusBlobId: newBlobId,
      };

      return {
        ...d,
        blobId: newBlobId,
        hashHex: newHashHex ?? d.hashHex,
        metadata: updatedMeta,
      };
    }
    return d;
  });

  localStorage.setItem(key, JSON.stringify(updated));

  const last = loadLastCreatedDoc();
  if (last && (last.objectId === docId || last.blobId === docId)) {
    const updatedLast: StoredDocMetadata = {
      ...last,
      blobId: newBlobId,
      hashHex: newHashHex ?? last.hashHex,
      metadata: {
        ...(last.metadata ?? {
          kind: "pdf",
          subject: last.subject ?? "",
          walrusBlobId: last.blobId,
        }),
        walrusBlobId: newBlobId,
      },
    };
    localStorage.setItem(LAST_CREATED_KEY, JSON.stringify(updatedLast));
  }
}
