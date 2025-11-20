// /frontend/src/storage.ts
// Walrus stub + local doc metadata store.

import { toBase64 } from "./cryptoHelpers";

/* ---------- Walrus blob storage ---------- */

export type StoredBlob = {
  cipherB64: string;
  ivB64: string;
  mimeType: string;
  fileName: string;
};

const BLOB_STORAGE_PREFIX = "suisign_blob_";

export async function saveEncryptedBlob(
  cipherBytes: Uint8Array,
  ivB64: string,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const id = `local-${crypto.randomUUID()}`;

  const record: StoredBlob = {
    cipherB64: toBase64(cipherBytes),
    ivB64,
    mimeType,
    fileName,
  };

  localStorage.setItem(BLOB_STORAGE_PREFIX + id, JSON.stringify(record));

  // In real Walrus integration, this would be the walrus_blob_id
  return id;
}

export async function fetchEncryptedBlob(
  blobId: string,
): Promise<StoredBlob | null> {
  const raw = localStorage.getItem(BLOB_STORAGE_PREFIX + blobId);
  if (!raw) return null;
  return JSON.parse(raw) as StoredBlob;
}

/* ---------- Local doc metadata storage ---------- */

export type StoredDocStatus = "pending" | "signed" | "completed";

export type StoredDocMetadata = {
  objectId: string;   // on-chain Document id (0x...) or "" if unknown
  blobId: string;     // Walrus blob id (local-... for now)
  hashHex: string;
  ivB64: string;
  keyB64: string;
  subject: string;
  message: string;
  createdAt: string;
  signers?: string[];
  status?: StoredDocStatus;
  signedAddresses?: string[];
  senderAddress?: string;
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

  // remove any prior entry with same blobId/objectId
  const filtered = existing.filter(
    (d) => (d.blobId || d.objectId) !== docKey,
  );

  const normalized: StoredDocMetadata = {
    objectId: doc.objectId ?? "",
    blobId: doc.blobId ?? docKey,
    hashHex: doc.hashHex ?? "",
    ivB64: doc.ivB64 ?? "",
    keyB64: doc.keyB64 ?? "",
    subject: doc.subject ?? "",
    message: doc.message ?? "",
    createdAt: doc.createdAt ?? new Date().toISOString(),
    signers: doc.signers ?? [],
    status: doc.status ?? "pending",
    signedAddresses: doc.signedAddresses ?? [],
    senderAddress: doc.senderAddress ? doc.senderAddress.toLowerCase() : "",
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
