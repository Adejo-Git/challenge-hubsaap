document_type: architecture-artifact
artifact: frontend-asset-library-map
title: Hub SaaP — Frontend Asset / Library Map
owner: platform-architecture
status: active
language: pt-BR
scope: hubsaap-frontend
version: 1.0

# Hub SaaP — Frontend Asset / Library Map

## 1. Propósito

Este documento descreve o **mapa de bibliotecas e assets do frontend do Hub SaaP**.

Seu objetivo é tornar explícito:

- quais bibliotecas existem no workspace
- qual responsabilidade pertence a cada grupo
- quais bibliotecas são compartilhadas pela plataforma
- quais bibliotecas pertencem ao modelo de Tool
- quais dependências são permitidas entre elas

Este documento é derivado diretamente do catálogo oficial **catalog-libraries-hubsaap.md** e representa a **visão arquitetural do conjunto de libraries do frontend**.

---

# 2. Estrutura Geral de Libraries

O frontend do Hub SaaP organiza suas bibliotecas em dois grandes grupos arquiteturais:

- **Shared Libraries**
- **Tool Libraries**

Essa separação garante que:

- infraestrutura reutilizável permaneça neutra de domínio
- Tools não dependam diretamente umas das outras
- o Shell e as Tools utilizem assets consistentes
- o workspace mantenha governança clara de dependências

---

# 3. Shared Libraries

As **shared libraries** fornecem capacidades reutilizáveis para toda a plataforma.

Elas podem ser consumidas por:

- Shell
- Tool plugins
- outras bibliotecas shared

Elas **não podem depender de código de domínio de Tool**.

---

## 3.1 UI Libraries

### ui-components
Path: `libs/shared/ui/ui-components`

Responsável por fornecer **componentes visuais reutilizáveis** da plataforma.

Responsabilidades típicas:

- componentes base de interface
- primitives reutilizáveis
- comportamento visual compartilhado

Consumidores típicos:

- Shell
- Tools
- bibliotecas de layout

---

### ui-layout
Path: `libs/shared/ui/ui-layout`

Responsável por fornecer **primitivas estruturais de layout**.

Exemplos:

- containers
- estrutura de páginas
- helpers de composição estrutural

Consumidores típicos:

- Shell
- Tools

---

### ui-feedback
Path: `libs/shared/ui/ui-feedback`

Responsável por **componentes e helpers de feedback ao usuário**.

Exemplos:

- alertas
- mensagens de status
- indicadores de erro ou sucesso

---

### ui-icons-assets
Path: `libs/shared/ui/ui-icons-assets`

Centraliza **assets de ícones e recursos visuais reutilizáveis**.

Objetivo:

- evitar duplicação de icon packs
- padronizar acesso a ícones da plataforma

---

### ui-tokens
Path: `libs/shared/ui/ui-tokens`

Define os **design tokens do sistema visual**.

Exemplos:

- cores
- espaçamentos
- tipografia
- escalas visuais

Esses tokens são a base do design system da plataforma.

---

### ui-theme
Path: `libs/shared/ui/ui-theme`

Fornece a **infraestrutura de tema da plataforma**.

Responsabilidades:

- aplicação de temas
- helpers de theming
- integração com design tokens

Consumidores típicos:

- ui-components
- ui-layout
- Shell

---

### wizard-shell
Path: `libs/shared/ui/wizard-shell`

Fornece **estrutura reutilizável para fluxos multi-step**.

Responsabilidades:

- shell visual de wizard
- navegação entre passos
- helpers de composição de etapas

Não contém:

- regras de validação de domínio
- lógica específica de Tool

---

## 3.2 Tooling / Development Libraries

### ui/tooling-storybook
Path: `libs/shared/ui/tooling-storybook`

Fornece **infraestrutura de Storybook compartilhada** para desenvolvimento de UI.

Responsabilidades:

- helpers de Storybook
- padronização de stories

---

### ui/ui-storybook-example

Biblioteca de **exemplos de uso do Storybook** para desenvolvimento de UI.

Usada como referência de desenvolvimento, não como runtime.

---

# 4. Tool Libraries

As bibliotecas do grupo **tool** suportam o modelo de integração de Tools com o Shell.

Elas definem:

- contratos
- infraestrutura de plugin
- registro de Tools
- SDK de acesso a APIs

---

## 4.1 tool-contract

Path: `libs/tool/tool-contract`

Define o **contrato oficial entre Tools e o Shell**.

Responsabilidades:

- interfaces de Tool
- metadata de Tool
- estruturas de integração

Toda Tool integrada ao Hub SaaP deve implementar este contrato.

---

## 4.2 tool-plugin

Path: `libs/tool/tool-plugin`

Fornece **infraestrutura reutilizável para plugins de Tool**.

Responsabilidades:

- helpers de plugin
- integração de lifecycle
- suporte à inicialização de Tool

---

## 4.3 tool-registry

Path: `libs/tool/tool-registry`

Implementa o **registro de Tools da plataforma**.

Responsabilidades:

- registro
- descoberta
- lookup de Tools

Consumidores:

- Shell
- mecanismo de carregamento de Tools

---

## 4.4 tool-data-access-sdk

Path: `libs/tool/tool-data-access-sdk`

Fornece **SDK frontend reutilizável para integração com APIs de Tool**.

Responsabilidades:

- helpers de client
- abstrações de acesso a API
- modelos de integração

Não contém:

- endpoints específicos de Tool
- lógica de domínio

---

## 4.5 governance/nx-boundary-rules

Path: `libs/tool/governance/nx-boundary-rules`

Biblioteca responsável por **governança arquitetural do monorepo**.

Responsabilidades:

- regras Nx de dependência
- enforcement de limites arquiteturais
- suporte a automação de governança

---

# 5. Regras de Dependência

O workspace segue regras arquiteturais explícitas.

### Shared libraries

Podem depender de:

- contracts
- outras shared libraries

Não podem depender de:

- Tool domain code
- Tool APIs

---

### Tool libraries

Podem depender de:

- shared
- contracts
- access-layer
- outras bibliotecas tool quando justificável

Não podem depender de:

- domínio de outras Tools
- UI específica de Tool

---

# 6. Objetivo Arquitetural do Mapa de Libraries

Este mapa existe para garantir:

- governança do workspace Nx
- previsibilidade de dependências
- separação entre infraestrutura e domínio
- integração consistente de novas Tools
- reuso saudável de assets

---

# 7. Relação com Integração de Novas Tools

Ao criar uma nova Tool para o Hub SaaP:

- a Tool implementa `tool-contract`
- a Tool integra-se via `tool-plugin`
- a Tool é registrada em `tool-registry`
- a Tool pode usar `tool-data-access-sdk` para APIs
- a Tool pode consumir bibliotecas shared

A Tool **não deve criar infraestrutura paralela que já exista nas bibliotecas da plataforma**.

---

# 8. Princípio Final

O conjunto de libraries do frontend do Hub SaaP deve permanecer:

- pequeno
- governado
- semanticamente claro

A criação de novas bibliotecas deve ocorrer apenas quando:

- existir reutilização real
- existir separação clara de responsabilidade
- a biblioteca representar uma nova capacidade arquitetural legítima
