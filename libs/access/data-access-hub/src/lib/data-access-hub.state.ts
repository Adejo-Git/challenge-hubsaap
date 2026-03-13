import { BehaviorSubject, Observable } from 'rxjs';
import { CatalogItem } from './data-access-hub.model';

export class DataAccessHubState {
  private _catalog$ = new BehaviorSubject<CatalogItem[] | null>(null);
  private _catalogTimestamp?: number;
  private ttlMs = 1000 * 60 * 5; // default 5 minutes

  get catalog$(): Observable<CatalogItem[] | null> {
    return this._catalog$.asObservable();
  }

  getCachedCatalog(): CatalogItem[] | null {
    const c = this._catalog$.getValue();
    if (!c) return null;
    if (this._catalogTimestamp && Date.now() - this._catalogTimestamp > this.ttlMs) return null;
    return c;
  }

  setCatalog(items: CatalogItem[] | null) {
    this._catalog$.next(items);
    this._catalogTimestamp = items ? Date.now() : undefined;
  }

  invalidateCatalog() {
    this._catalog$.next(null);
    this._catalogTimestamp = undefined;
  }

  setTtl(ms: number) {
    this.ttlMs = ms;
  }
}
