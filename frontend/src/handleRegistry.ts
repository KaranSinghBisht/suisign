// /frontend/src/handleRegistry.ts
//
// Very simple local handle registry for SuiSign.
// - Lets you map a short handle or ".sui" name to a Sui address.
// - Used by:
//    - resolveHandlesOrAddresses() when composing a document
//    - getHandleForAddress() when rendering labels in the UI
//
// For hackathon purposes this is entirely localStorage-based.
// Later we can plug in real SuiNS / SNS lookups here.

const HANDLES_STORAGE_KEY = "suisign_handles_v1";

export type HandleRecord = {
  handle: string; // e.g. "kryptos" or "kryptos.sui"
  address: string; // 0x...
};

function normaliseHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

function normaliseAddress(raw: string): string {
  return raw.trim().toLowerCase();
}

function loadHandleRecords(): HandleRecord[] {
  try {
    const raw = localStorage.getItem(HANDLES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as HandleRecord[]).map((r) => ({
      handle: normaliseHandle(r.handle),
      address: normaliseAddress(r.address),
    }));
  } catch {
    return [];
  }
}

function saveHandleRecords(records: HandleRecord[]) {
  localStorage.setItem(HANDLES_STORAGE_KEY, JSON.stringify(records));
}

export function upsertHandle(handle: string, address: string) {
  const h = normaliseHandle(handle);
  const a = normaliseAddress(address);
  if (!h || !a.startsWith("0x")) return;

  const all = loadHandleRecords();
  const existingIndex = all.findIndex(
    (r) => r.handle === h || r.address === a,
  );

  if (existingIndex >= 0) {
    all[existingIndex] = { handle: h, address: a };
  } else {
    all.push({ handle: h, address: a });
  }

  saveHandleRecords(all);
}

function lookupByHandle(handle: string): string | null {
  const h = normaliseHandle(handle);
  if (!h) return null;

  const all = loadHandleRecords();
  const rec = all.find((r) => r.handle === h);
  return rec ? rec.address : null;
}

function lookupByAddress(address?: string | null): string | null {
  if (!address) return null;
  const a = normaliseAddress(address);
  if (!a.startsWith("0x")) return null;

  const all = loadHandleRecords();
  const rec = all.find((r) => r.address === a);
  return rec ? rec.handle : null;
}

export function getHandleForAddress(address?: string | null): string | null {
  const handle = lookupByAddress(address ?? undefined);
  if (!handle) return null;

  const h = handle.trim().toLowerCase();

  if (h.startsWith("0x") && !h.includes(".") && h.length > 10) {
    return null;
  }

  if (h.endsWith(".sui")) {
    return handle.replace(/\.sui$/i, "");
  }

  return handle;
}

export function resolveHandlesOrAddresses(inputs: string[]): string[] {
  const resolved: string[] = [];

  for (const raw of inputs) {
    const value = raw.trim();
    if (!value) continue;

    const lower = value.toLowerCase();

    if (lower.startsWith("0x") && lower.length > 10) {
      resolved.push(lower);
      upsertHandle(lower, lower);
      continue;
    }

    const handleKey = lower.endsWith(".sui") ? lower : `${lower}.sui`;

    const fromHandle = lookupByHandle(handleKey) ?? lookupByHandle(lower);

    if (fromHandle && fromHandle.startsWith("0x")) {
      resolved.push(fromHandle);
      continue;
    }

    console.warn("[SuiSign] Unknown signer handle:", value);
  }

  return Array.from(new Set(resolved));
}
