/**
 * @hub/access-layer - Public API
 * 
 * Exporta serviços e modelos da Access Layer para uso no Shell e Tools.
 */

// Context
export * from './lib/context/context.model';
export * from './lib/context/context.service';
export * from './lib/context/context.storage';
export * from './lib/context/context.validation';

// Permissions
export * from './lib/permissions/permission.model';
export * from './lib/permissions/permission.service';
export * from './lib/permissions/permission.adapters';
export * from './lib/permissions/permission.resolver';

// Feature Flags
export * from './lib/flags/feature-flag.model';
export * from './lib/flags/feature-flag.service';
export * from './lib/flags/feature-flag.adapters';
export * from './lib/flags/feature-flag.providers';
export * from './lib/flags/feature-flag.namespace';

// Decision
export * from './lib/decision/access-decision.model';
export * from './lib/decision/access-decision.service';
export * from './lib/decision/access-decision.requirements';
export * from './lib/decision/access-decision.util';

// Navigation
export * from './lib/navigation/navigation.model';
export * from './lib/navigation/navigation.service';
export * from './lib/navigation/navigation.builder';
export * from './lib/navigation/navigation.filter';
export * from './lib/navigation/navigation.breadcrumbs';
export * from './lib/navigation/navigation.active';

// Session
export * from './lib/session/session.model';
export * from './lib/session/session.service';
