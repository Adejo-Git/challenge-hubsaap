/**
 * ToolFeatureFlags Model
 * 
 * Tipagem do contrato declarativo de feature flags da tool.
 * 
 * Responsabilidades:
 * - Definir a estrutura de uma feature flag (FeatureDescriptor)
 * - Suportar regras declarativas de contexto (FeatureRule)
 * - Garantir tipagem forte das chaves de features (FeatureKey)
 * 
 * Não-responsabilidades:
 * - Implementar motor de avaliação de flags (isso é Access Layer do Hub)
 * - Conter lógica de autorização (permissões ficam no ToolPermissionMap)
 * - Realizar IO ou requisições HTTP
 */

/**
 * Chaves de features disponíveis nesta tool
 * 
 * Convenção: usar namespace da tool para evitar colisões
 * Exemplo: "tax-map:home", "tax-map:admin"
 * 
 * Tipo: string com padrão "toolKey:feature-name"
 */

/**
 * Estados possíveis de uma feature por ambiente
 */
export type FeatureState = 'enabled' | 'disabled' | 'beta' | 'deprecated';

/**
 * Configuração de estado default por ambiente
 */
export interface FeatureDefaultState {
  /** Estado em produção */
  prod?: FeatureState;
  /** Estado em homologação */
  hml?: FeatureState;
  /** Estado em desenvolvimento */
  dev?: FeatureState;
  /** Estado padrão (fallback) */
  default: FeatureState;
}

/**
 * Regras declarativas de contexto para habilitar uma feature
 * 
 * Estas regras são interpretadas pelo Access Layer do Hub.
 * Não contêm lógica executável, apenas metadados.
 */
export interface FeatureRule {
  /** Feature requer que um projeto esteja selecionado no contexto */
  requireProject?: boolean;
  /** Feature requer tenant específico (tier mínimo) */
  requireTenantTier?: 'basic' | 'premium' | 'enterprise';
  /** Feature requer contexto de cliente ativo */
  requireClient?: boolean;
  /** Feature é experimental (pode ser instável) */
  experimental?: boolean;
}

/**
 * Descritor completo de uma feature
 * 
 * Contrato mínimo necessário para o Hub avaliar visibilidade
 * e disponibilidade de rotas/recursos.
 */
export interface FeatureDescriptor {
  /** Chave única da feature (namespaceada pela tool, formato: "toolKey:feature-name") */
  key: string;
  
  /** Título legível da feature */
  title: string;
  
  /** Descrição do propósito ou capacidade da feature */
  description: string;
  
  /** Estado default da feature por ambiente */
  defaultState: FeatureDefaultState;
  
  /** Regras declarativas de contexto (opcional) */
  rules?: FeatureRule;
  
  /** Categoria ou grupo da feature (para organização no catálogo) */
  category?: 'core' | 'advanced' | 'admin' | 'experimental';
  
  /** Data de criação/adição da feature (para auditoria) */
  createdAt?: string;
  
  /** Versão mínima requerida da tool (semver) */
  minVersion?: string;
}

/**
 * Mapa de feature flags da tool
 * 
 * Estrutura: Record<string, FeatureDescriptor>
 * As chaves seguem o padrão "toolKey:feature-name"
 */
export type ToolFeatureFlagsMap = Record<string, FeatureDescriptor>;
