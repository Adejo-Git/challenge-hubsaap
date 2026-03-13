const STORAGE_KEY = 'hubsaap:observability:v1:correlationId';

type CryptoLike = Pick<Crypto, 'getRandomValues'>;
type GlobalWithCrypto = typeof globalThis & { crypto?: CryptoLike };

function uuidv4(): string {
  // Prefer secure RNG when available
  try {
    const globalCrypto = typeof crypto !== 'undefined'
      ? crypto
      : (globalThis as GlobalWithCrypto).crypto ?? null;
    if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
      const buf = new Uint8Array(16);
      globalCrypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
      buf[8] = (buf[8] & 0x3f) | 0x80; // variant
      const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
    }
  } catch {
    // fallthrough to fallback
  }
  // Fallback non-cryptographic UUIDv4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-bitwise
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function persistCorrelationId(id: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    // sessionStorage may be unavailable (privacy mode) – silently ignore.
  }
}

export function restoreCorrelationId(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let inMemoryCorrelationId: string | null = null;

export function getOrCreateCorrelationId(): string {
  const restored = restoreCorrelationId();
  if (restored) {
    inMemoryCorrelationId = restored;
    return restored;
  }
  if (!inMemoryCorrelationId) {
    inMemoryCorrelationId = uuidv4();
    try {
      persistCorrelationId(inMemoryCorrelationId);
    } catch {
      // noop
    }
  }
  return inMemoryCorrelationId;
}

export function getCorrelationId(): string | null {
  if (inMemoryCorrelationId) return inMemoryCorrelationId;
  return restoreCorrelationId();
}

export function resetCorrelationId(): string {
  inMemoryCorrelationId = uuidv4();
  try {
    persistCorrelationId(inMemoryCorrelationId);
  } catch {
    // noop
  }
  return inMemoryCorrelationId;
}
