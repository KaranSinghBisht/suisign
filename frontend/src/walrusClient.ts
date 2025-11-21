// frontend/src/walrusClient.ts
// Thin wrapper over Walrus HTTP publisher/aggregator.

const PUBLISHER_BASE = import.meta.env.VITE_WALRUS_PUBLISHER_URL as string;
const AGGREGATOR_BASE = import.meta.env.VITE_WALRUS_AGGREGATOR_URL as string;

if (!PUBLISHER_BASE || !AGGREGATOR_BASE) {
  console.warn("[Walrus] VITE_WALRUS_{PUBLISHER,AGGREGATOR}_URL not set");
}

type WalrusStoreResponse = {
  newlyCreated?: {
    blobObject: {
      id: string;
      blobId: string;
      size: number;
    };
  };
  alreadyCertified?: {
    blobId: string;
    endEpoch: number;
  };
};

export type WalrusStoreResult = {
  blobId: string;
  objectId?: string;
  raw: WalrusStoreResponse;
};

/**
 * Store ciphertext bytes on Walrus via publisher.
 * Defaults: 1 epoch, deletable=false (permanent=true).
 */
export async function walrusStoreBlob(
  data: Uint8Array,
  opts?: {
    epochs?: number;
    permanent?: boolean;
    deletable?: boolean;
  },
): Promise<WalrusStoreResult> {
  if (!PUBLISHER_BASE) {
    throw new Error("Walrus publisher URL is not configured");
  }

  const params = new URLSearchParams();
  if (opts?.epochs != null) params.set("epochs", String(opts.epochs));
  if (opts?.permanent) params.set("permanent", "true");
  if (opts?.deletable) params.set("deletable", "true");

  const url =
    params.toString().length > 0
      ? `${PUBLISHER_BASE}/v1/blobs?${params.toString()}`
      : `${PUBLISHER_BASE}/v1/blobs`;

  const res = await fetch(url, {
    method: "PUT",
    // Uint8Array is accepted by fetch in browsers; cast to satisfy TS libs.
    body: data as unknown as BodyInit,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `[Walrus] store failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const json = (await res.json()) as WalrusStoreResponse;

  const blobId =
    json.newlyCreated?.blobObject?.blobId ?? json.alreadyCertified?.blobId;
  if (!blobId) {
    console.error("[Walrus] unexpected store response", json);
    throw new Error("Walrus store: missing blobId in response");
  }

  const objectId = json.newlyCreated?.blobObject?.id;

  return { blobId, objectId, raw: json };
}

/**
 * Read raw ciphertext bytes from Walrus aggregator by blobId.
 */
export async function walrusReadBlob(blobId: string): Promise<Uint8Array> {
  if (!AGGREGATOR_BASE) {
    throw new Error("Walrus aggregator URL is not configured");
  }

  const url = `${AGGREGATOR_BASE}/v1/blobs/${encodeURIComponent(blobId)}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `[Walrus] read failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
