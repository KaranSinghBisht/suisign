// frontend/src/handleRegistry.ts

const HANDLES_KEY = "suisign_handles";

type HandleMap = Record<string, string>; // address (lowercase) -> handle

function loadMap(): HandleMap {
  try {
    const raw = localStorage.getItem(HANDLES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as HandleMap;
  } catch {
    return {};
  }
}

function saveMap(map: HandleMap) {
  localStorage.setItem(HANDLES_KEY, JSON.stringify(map));
}

// Get handle for an address
export function getHandleForAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const map = loadMap();
  return map[address.toLowerCase()] ?? null;
}

// Set handle for this address
export function setHandleForAddress(address: string, handle: string) {
  const map = loadMap();
  map[address.toLowerCase()] = handle;
  saveMap(map);
}

// Find which address owns a handle
export function findAddressByHandle(handle: string): string | null {
  const map = loadMap();
  const target = handle.toLowerCase();
  for (const [addr, h] of Object.entries(map)) {
    if (h.toLowerCase() === target) return addr;
  }
  return null;
}

// Check if handle is already taken by *another* address
export function isHandleTaken(handle: string, currentAddress?: string | null): boolean {
  const owner = findAddressByHandle(handle);
  if (!owner) return false;
  if (!currentAddress) return true;
  return owner.toLowerCase() !== currentAddress.toLowerCase();
}

export function resolveHandlesOrAddresses(inputs: string[]): string[] {
  const resolved = new Set<string>();

  for (const raw of inputs) {
    const value = raw.trim();
    if (!value) continue;

    if (value.startsWith("0x") && value.length > 10) {
      resolved.add(value.toLowerCase());
      continue;
    }

    const addr = findAddressByHandle(value);
    if (addr) {
      resolved.add(addr.toLowerCase());
    }
  }

  return Array.from(resolved);
}
