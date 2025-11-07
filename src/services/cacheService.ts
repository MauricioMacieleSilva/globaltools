import { ComercialData } from '@/context/ComercialContext';

interface CacheItem {
  data: ComercialData[];
  timestamp: number;
  expiry: number;
}

class CacheService {
  private cache = new Map<string, CacheItem>();
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutos

  set(key: string, data: ComercialData[], expiry = this.DEFAULT_EXPIRY): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  get(key: string): ComercialData[] | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    if (now - item.timestamp > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  isExpired(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return true;
    
    const now = Date.now();
    return now - item.timestamp > item.expiry;
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const cacheService = new CacheService();