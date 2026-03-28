/** Minimal ioredis-like stub for Jest (token rotation + account lock). */
export function createMemoryRedis() {
  const data = new Map<string, string>();

  const api = {
    get: (k: string) => Promise.resolve(data.get(k) ?? null),
    set: (k: string, v: string) => {
      data.set(k, v);
      return Promise.resolve('OK' as const);
    },
    setex: (k: string, _ttl: number, v: string) => {
      data.set(k, v);
      return Promise.resolve('OK' as const);
    },
    del: (...keys: string[]) => {
      let n = 0;
      for (const k of keys) {
        if (data.delete(k)) {
          n++;
        }
      }
      return Promise.resolve(n);
    },
    incr: (k: string) => {
      const cur = parseInt(data.get(k) || '0', 10) + 1;
      data.set(k, String(cur));
      return Promise.resolve(cur);
    },
    expire: (_k: string, _sec: number) => Promise.resolve(1),
    ttl: (k: string) => {
      if (!data.has(k)) {
        return Promise.resolve(-2);
      }
      return Promise.resolve(600);
    },
    scan: (cursor: string, ...args: unknown[]) => {
      const strs = args as string[];
      const matchIdx = strs.indexOf('MATCH');
      const pattern = matchIdx >= 0 ? strs[matchIdx + 1] : '*';
      const keys = [...data.keys()].filter((key) => {
        if (pattern === '*') return true;
        if (pattern.endsWith('*')) {
          return key.startsWith(pattern.slice(0, -1));
        }
        return key === pattern;
      });
      return Promise.resolve([cursor === '0' ? '0' : '0', keys] as [string, string[]]);
    },
    __clear: () => data.clear(),
  };
  return api;
}

export type MemoryRedis = ReturnType<typeof createMemoryRedis>;

let singleton: MemoryRedis | null = null;

export function getTestRedis(): MemoryRedis {
  if (!singleton) {
    singleton = createMemoryRedis();
  }
  return singleton;
}

export function resetTestRedis(): void {
  getTestRedis().__clear();
}
