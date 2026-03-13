# Mock Services

Este diretório contém **mocks temporários** dos serviços da Access Layer e Shared Libs.

## ⚠️ Atenção

Estes mocks devem ser **substituídos** por implementações reais quando as libs estiverem disponíveis:

- `SessionServiceMock` → `@hub/access-layer/session`
- `ContextServiceMock` → `@hub/access-layer/context`
- `NavigationServiceMock` → `@hub/access-layer/navigation`
- `NotificationServiceMock` → `@hub/shared/notification`
- `ObservabilityServiceMock` → `@hub/shared/observability`

## 🎯 Propósito

Os mocks permitem desenvolvimento e testes do `AppShellComponent` sem bloquear pelo desenvolvimento das libs de infraestrutura.

## 🔄 Migration Path

1. Instalar lib real: `npm install @hub/access-layer`
2. Atualizar imports no `app-shell.component.ts`
3. Deletar arquivos `*.mock.ts`
4. Executar testes para validar integração

## 📋 Arquivos

- `session.service.mock.ts` - Sessão do usuário (login/token)
- `context.service.mock.ts` - Contexto ativo (tenant/cliente/projeto)
- `navigation.service.mock.ts` - Árvore de navegação
- `notification.service.mock.ts` - Notificações agregadas
- `observability.service.mock.ts` - Telemetria e logs
