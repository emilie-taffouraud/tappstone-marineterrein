const cache = new Map();

export async function getOrSetCache(key, ttlMs, loader) {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return {
      ...cached.value,
      cache: { hit: true, key, expiresAt: new Date(cached.expiresAt).toISOString() },
    };
  }

  const value = await loader();
  cache.set(key, {
    expiresAt: now + ttlMs,
    value,
  });

  return {
    ...value,
    cache: { hit: false, key, expiresAt: new Date(now + ttlMs).toISOString() },
  };
}

export function clearCache(prefix = "") {
  for (const key of cache.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
