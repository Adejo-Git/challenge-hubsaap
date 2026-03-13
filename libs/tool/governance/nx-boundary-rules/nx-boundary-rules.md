# Nx Boundary Rules — Hub SaaP

Versão: v1.0.0

Objetivo
--------
Materializar as regras de boundary do Hub SaaP em artefatos auditáveis: taxonomia de tags Nx (type:/scope:), depConstraints canônicos e snippets para aplicar no lint (`enforce-module-boundaries`). As regras evitam importações proibidas (ex.: Tool → Shell) e orientam a criação de facades/contracts quando necessário.

Taxonomia mínima de tags
------------------------
- `type:shell` — código do Shell/orquestrador.
- `type:tool` — ferramentas/feature apps (cada ferramenta pode ter `scope:<toolKey>`).
- `type:shared` — bibliotecas reutilizáveis e agnósticas de domínio.
- `type:access` — Access Layer (session/context/permission/decision/navigation).
- `type:domain` — lógica de domínio e modelos (não UI).
 - `type:contracts` — contratos/ports/facades entre camadas (tipos, adapters).

Sugestões de scopes
-------------------
- `scope:shell` — libs pertencentes ao Shell.
- `scope:<toolKey>` — libs pertencentes a uma Tool específica.
 - `scope:shared` — libs compartilhadas e cross-cutting (promovidas a Shared)

Princípios
----------
- Nunca desativar `enforce-module-boundaries` como solução.
- Preferir `type:contracts` para decoupling; criar adapters/facades antes de permitir imports diretos.
- Regras devem ser testáveis e aplicadas via lint/CI.

Anti-patterns proibidos
-----------------------
- Tool → Shell
- Shared → Tool / Shell / UI
- Domain → UI

Processo de mudança
-------------------
Mudanças nas regras exigem PR com:
- documento atualizado
- snippet do ESLint/`dep-constraints.catalog.json`
- evidência de validação (lint local/CI)

Evidências requeridas
---------------------
- PR com arquivos aqui contidos
- Revisão arquitetural aprovada
- Aplicação do checklist em ao menos 1 caso real

