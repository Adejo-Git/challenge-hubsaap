export class SessionService {
  isAuthenticated() { return false; }
  restoreOrRefresh() { return Promise.resolve(false); }
}
