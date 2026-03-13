import { ErrorCategory, ErrorCode, Severity } from '@hub/error-model';
import { FlagKey, ToolKey, FeatureKey } from './feature-flag.model';

/**
 * Regex do Hub: exatamente um ponto, apenas alfanumérico/hífen/underscore.
 * Válido: "global.dashboard", "toolA.export"
 * Inválido: "nodot", "a.b.c", "GLOBAL.DASH"
 */
const FLAG_KEY_REGEX = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;

/**
 * Erro padronizado para falhas de namespace/chave de flag.
 * Integrado ao error-model do Hub: category=FLAGS, errorCode=VALIDATION_ERROR.
 *
 * @example
 * try { validateFlagKey('invalid') }
 * catch (e) {
 *   if (e instanceof FlagValidationError) {
 *     console.log(e.code);       // 'MissingFlagKey' | 'InvalidNamespace'
 *     console.log(e.category);   // ErrorCategory.FLAGS
 *     console.log(e.errorCode);  // ErrorCode.VALIDATION_ERROR
 *   }
 * }
 */
export class FlagValidationError extends Error {
  /** Categoria do error-model: FLAGS */
  readonly category = ErrorCategory.FLAGS;
  /** Código do error-model: VALIDATION_ERROR */
  readonly errorCode = ErrorCode.VALIDATION_ERROR;
  /** Severidade: WARNING (não é erro crítico de runtime) */
  readonly severity = Severity.WARNING;

  constructor(
    /** Código semântico da Access Layer */
    public readonly code: 'MissingFlagKey' | 'InvalidNamespace',
    message: string
  ) {
    super(message);
    this.name = 'FlagValidationError';
  }
}

/**
 * Constrói a chave composta "toolKey.featureKey".
 * Valida ambas as partes antes de montar.
 */
export function buildToolFlagKey(toolKey: ToolKey, featureKey: FeatureKey): FlagKey {
  validateToolKey(toolKey);
  validateFeatureKey(featureKey);
  return `${toolKey}.${featureKey}`;
}

/**
 * Valida se a FlagKey segue o formato "namespace.featureName".
 * Lança FlagValidationError em caso de violação.
 */
export function validateFlagKey(key: FlagKey): void {
  if (!key || key.trim() === '') {
    throw new FlagValidationError('MissingFlagKey', 'Flag key must not be empty');
  }
  if (!FLAG_KEY_REGEX.test(key)) {
    throw new FlagValidationError(
      'InvalidNamespace',
      `Invalid flag key: "${key}". Expected format: "namespace.featureName" (one dot, alphanumeric/hyphen/underscore only)`
    );
  }
}

function validateToolKey(toolKey: string): void {
  if (!toolKey || toolKey.trim() === '') {
    throw new FlagValidationError('MissingFlagKey', 'Tool key must not be empty');
  }
  if (toolKey.includes('.')) {
    throw new FlagValidationError(
      'InvalidNamespace',
      `Tool key must not contain dots: "${toolKey}"`
    );
  }
}

function validateFeatureKey(featureKey: string): void {
  if (!featureKey || featureKey.trim() === '') {
    throw new FlagValidationError('MissingFlagKey', 'Feature key must not be empty');
  }
  if (featureKey.includes('.')) {
    throw new FlagValidationError(
      'InvalidNamespace',
      `Feature key must not contain dots: "${featureKey}"`
    );
  }
}
