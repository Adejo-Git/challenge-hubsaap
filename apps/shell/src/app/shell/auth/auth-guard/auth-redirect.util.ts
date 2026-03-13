export function buildLoginRedirectUrl(returnUrl: string): string {
  // Previne loops: não inclui returnUrl se já for rota do fluxo de auth (/auth/login, /auth/callback, etc.)
  if (returnUrl.startsWith('/auth/')) {
    return '/auth/login';
  }
  // Unifica para /auth/login
  return `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}
