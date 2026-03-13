/**
 * Modelos contratuais do ToolContextAdapter
 * 
 * Estes tipos são a interface estável entre o Hub e as Tools.
 * Evitam que Tools dependam de tipos internos do Access Layer.
 * 
 * Design principles:
 * - Minimal surface: apenas o necessário para Tools
 * - Immutable: Tools não devem modificar o contexto do Hub
 * - Versionable: permitir evolução sem quebrar Tools existentes
 * - No sensitive data: apenas IDs e claims essenciais
 */

/**
 * Sessão mínima da Tool
 * Contém apenas dados essenciais do usuário autenticado
 */
export interface ToolSession {
  /** ID único do usuário */
  userId: string;
  
  /** Nome do usuário para exibição */
  userName: string;
  
  /** Email do usuário */
  userEmail: string;
  
  /** Roles do usuário (para UX, não para decisão de acesso) */
  roles: string[];
  
  /** Token expira em (timestamp) - para UX de renovação */
  expiresAt: number;
}

/**
 * Contexto ativo da Tool
 * Representa tenant/cliente/projeto selecionado
 */
export interface ToolContext {
  /** Sessão do usuário */
  session: ToolSession;
  
  /** ID do tenant ativo */
  tenantId: string;
  
  /** Nome do tenant para exibição */
  tenantName: string;
  
  /** ID do cliente ativo (nullable) */
  clientId: string | null;
  
  /** Nome do cliente para exibição (nullable) */
  clientName: string | null;
  
  /** ID do projeto ativo (nullable) */
  projectId: string | null;
  
  /** Nome do projeto para exibição (nullable) */
  projectName: string | null;
  
  /** Ambiente (dev/staging/production) */
  environment: 'dev' | 'staging' | 'production';
  
  /** Timestamp da última atualização do contexto */
  updatedAt: number;
}

/**
 * Runtime Capabilities da Tool
 * Indica o que a Tool pode fazer baseado em flags e decisões (runtime)
 * Diferente de ToolCapabilities que define o contrato estático
 */
export interface ToolRuntimeCapabilities {
  /** Features habilitadas (flags) */
  enabledFeatures: string[];
  
  /** Ações permitidas (baseado em decisão de acesso) */
  allowedActions: string[];
  
  /** Tool está habilitada (gating) */
  isToolEnabled: boolean;
  
  /** Razão de desabilitação (se aplicável) */
  disabledReason?: string;
}

/**
 * Snapshot completo para bootstrap de Tool
 */
export interface ToolContextSnapshot {
  context: ToolContext;
  capabilities: ToolRuntimeCapabilities;
}

/**
 * Evento de mudança de contexto
 */
export interface ToolContextChange {
  /** Contexto anterior (pode ser null no primeiro load) */
  previous: ToolContext | null;
  
  /** Contexto atual */
  current: ToolContext;
  
  /** Tipo de mudança */
  changeType: 'tenant' | 'client' | 'project' | 'session' | 'full';
  
  /** Timestamp da mudança */
  timestamp: number;
}
