/**
 * Public API Surface of feature-flag module
 * Access Layer - Feature Flags
 */

// Core service
export { FeatureFlagService } from './feature-flag.service';

// Models and types
export { 
  FlagKey, 
  ToolKey, 
  FeatureKey, 
  FlagStateLite, 
  FlagSnapshotLite 
} from './feature-flag.model';

// Adapter interface
export { 
  FeatureFlagsAdapter,
  FlagExplanation 
} from './feature-flag.adapters';

// Namespace validation (for advanced use cases)
export { 
  FlagValidationError, 
  buildToolFlagKey, 
  validateFlagKey 
} from './feature-flag.namespace';

// Providers and DI tokens
export {
  provideFeatureFlagService,
  provideFeatureFlagServiceStandalone,
  FEATURE_FLAGS_ADAPTER_TOKEN,
  CONTEXT_INVALIDATION_TOKEN,
  CONTEXT_SNAPSHOT_TOKEN,
  FeatureFlagServiceConfig
} from './feature-flag.providers';
