import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

const client = new SuiClient({ url: getFullnodeUrl("testnet") });

const STORAGE_KEY = "suisign_handle_cache_v1";

type StoredHandleCache = {
  nameToAddress: Record<string, string>;
  addressToName: Record<string, string>;
};

const NAME_TO_ADDRESS = new Map<string, string>();
const ADDRESS_TO_NAME = new Map<string, string>();

function normalizeName(raw: string): string {
  let name = raw.trim().toLowerCase();
  if (!name.endsWith(".sui")) {
    name = `${name}.sui`;
  }
  return name;
}

/**
 * Given a 0x address, return the bare handle (e.g. "kryptos"),
 * or "" if we don't know one yet.
 *
 * This is sync on purpose so the UI can keep using it.
 */
export function getHandleForAddress(addr: string): string {
  if (!addr) return "";
  const lower = addr.toLowerCase();
  const full = ADDRESS_TO_NAME.get(lower);
  if (!full) return "";
  return full.endsWith(".sui") ? full.slice(0, -4) : full;
}

function loadFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredHandleCache;

    Object.entries(parsed.nameToAddress || {}).forEach(([name, addr]) => {
      NAME_TO_ADDRESS.set(name, addr);
    });
    Object.entries(parsed.addressToName || {}).forEach(([addr, name]) => {
      ADDRESS_TO_NAME.set(addr, name);
    });
  } catch (err) {
    console.warn("[SuiSign] Failed to load handle cache from storage:", err);
  }
}

function saveToStorage() {
  try {
    const nameToAddress: Record<string, string> = {};
    const addressToName: Record<string, string> = {};

    NAME_TO_ADDRESS.forEach((addr, name) => {
      nameToAddress[name] = addr;
    });
    ADDRESS_TO_NAME.forEach((name, addr) => {
      addressToName[addr] = name;
    });

    const payload: StoredHandleCache = { nameToAddress, addressToName };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[SuiSign] Failed to save handle cache to storage:", err);
  }
}

loadFromStorage();

/**
 * Resolve a list of signer inputs into 0x addresses.
 *
 * - "0x..." is treated as a direct address
 * - "kryptos" or "kryptos.sui" is resolved via SuiNS on testnet
 */
export async function resolveHandlesOrAddresses(
  pieces: string[],
): Promise<string[]> {
  const results: string[] = [];

  for (const raw of pieces) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (/^0x[0-9a-fA-F]{40,}$/.test(trimmed)) {
      results.push(trimmed.toLowerCase());
      continue;
    }

    const name = normalizeName(trimmed);

    const cached = NAME_TO_ADDRESS.get(name);
    if (cached) {
      results.push(cached);
      continue;
    }

    try {
      const addr = await client.resolveNameServiceAddress({ name });
      if (addr) {
        const lower = addr.toLowerCase();
        NAME_TO_ADDRESS.set(name, lower);
        ADDRESS_TO_NAME.set(lower, name);
        saveToStorage();
        results.push(lower);
      } else {
        console.warn("[SuiSign] No address for SuiNS name", name);
      }
    } catch (err) {
      console.warn("[SuiSign] Failed to resolve SuiNS name", name, err);
    }
  }

  return results;
}
