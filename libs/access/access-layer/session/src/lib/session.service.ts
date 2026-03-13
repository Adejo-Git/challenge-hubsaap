// Re-export the concrete Access Layer facade as the canonical SessionService.
// This keeps `libs/access/access-layer/session` as a compatibility entrypoint for Shell/AuthGuard,
// but avoids maintaining two different SessionService shapes. Use the workspace alias to
// respect Nx boundaries and avoid relative cross-lib imports.
export type { SessionService } from '@hub/access-layer';

// NOTE: legacy abstract contract removed in favor of the unified facade.
