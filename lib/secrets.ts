import "server-only";

// Cache em memória por processo. TTL curto pra permitir rotação sem restart.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { value: string; expiresAt: number }>();

export type SecretKey =
  | "PAGOU_SECRET_KEY"
  | "PAGOU_PUBLIC_KEY"
  | "PAGOU_API_URL"
  | "PAGOU_WEBHOOK_SECRET";

/**
 * Busca uma chave no process.env com cache em memória.
 */
export async function getSecret(key: SecretKey): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const envValue = process.env[key];
  if (envValue) {
    cache.set(key, { value: envValue, expiresAt: Date.now() + CACHE_TTL_MS });
    return envValue;
  }

  throw new Error(`Secret ${key} não encontrado no process.env.`);
}

export function invalidateSecret(key: SecretKey): void {
  cache.delete(key);
}
