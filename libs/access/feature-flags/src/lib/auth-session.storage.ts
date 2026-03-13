import { SessionRecord } from './auth-session.model';

export interface StorageService {
  get<T>(key: string): T | null | Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): void | Promise<void>;
  remove(key: string): void | Promise<void>;
}

export interface AuthSessionStorageOptions {
  namespace: string;
  ttlSeconds?: number;
}

export class AuthSessionStorage {
  private readonly key: string;
  private readonly ttlSeconds?: number;

  constructor(private storage: StorageService, options: AuthSessionStorageOptions) {
    this.key = `${options.namespace}:auth-session`;
    this.ttlSeconds = options.ttlSeconds;
  }

  async read(): Promise<SessionRecord | null> {
    const value = await this.storage.get<SessionRecord>(this.key);
    return value ?? null;
  }

  async write(record: SessionRecord): Promise<void> {
    await this.storage.set(this.key, record, this.ttlSeconds);
  }

  async clear(): Promise<void> {
    await this.storage.remove(this.key);
  }
}
