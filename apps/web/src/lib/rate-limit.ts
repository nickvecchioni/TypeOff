interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  limited: boolean;
  retryAfter?: number;
}

export function createRateLimit(opts: { windowMs: number; max: number }) {
  const map = new Map<string, RateLimitEntry>();

  // Periodically clean stale entries to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of map) {
      if (now >= entry.resetAt) map.delete(key);
    }
  }, 60_000).unref();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = map.get(key);

      if (!entry || now >= entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { limited: false };
      }

      entry.count++;
      if (entry.count > opts.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return { limited: true, retryAfter };
      }

      return { limited: false };
    },
  };
}
