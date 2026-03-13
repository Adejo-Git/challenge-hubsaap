/**
/**
 * Mock @angular/router for Jest tests
 */

import { Observable } from 'rxjs';

export class Router {
  // Changed any -> unknown to avoid explicit any lint warning
  public events: Observable<unknown> = new Observable();
}

// NavigationEnd must be a proper class so instanceof works
export class NavigationEnd {
  constructor(
    public id: number,
    public url: string,
    public urlAfterRedirects: string
  ) {}
}

export class ActivatedRoute {}
