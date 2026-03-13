import { SmartTableDensity } from './smart-table.model';

export interface SmartTablePreferences {
  visibleColumns?: string[];
  density?: SmartTableDensity;
  pageSize?: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class SmartTablePreferencesStore {
  private readonly memoryStorage = new Map<string, string>();

  constructor(private readonly storage?: StorageLike) {}

  read(key: string): SmartTablePreferences | null {
    const serialized = this.safeGet(this.namespace(key));
    if (!serialized) {
      return null;
    }

    try {
      const parsed = JSON.parse(serialized) as SmartTablePreferences;
      return {
        visibleColumns: parsed.visibleColumns ? [...parsed.visibleColumns] : undefined,
        density: parsed.density,
        pageSize: parsed.pageSize,
      };
    } catch {
      return null;
    }
  }

  write(key: string, value: SmartTablePreferences): void {
    this.safeSet(this.namespace(key), JSON.stringify(value));
  }

  private namespace(key: string): string {
    return `hubsaap:smart-table:${key}`;
  }

  private safeGet(key: string): string | null {
    if (this.storage) {
      try {
        return this.storage.getItem(key);
      } catch {
        return this.memoryStorage.get(key) ?? null;
      }
    }

    return this.memoryStorage.get(key) ?? null;
  }

  private safeSet(key: string, value: string): void {
    if (this.storage) {
      try {
        this.storage.setItem(key, value);
        return;
      } catch {
        this.memoryStorage.set(key, value);
        return;
      }
    }

    this.memoryStorage.set(key, value);
  }
}
