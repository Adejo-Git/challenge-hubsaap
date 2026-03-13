## [TECHLAB-001] Bootstrap do techlab-diary-service — foundation do serviço da Tool TechLab Diary

**Outcome:**

Criar a base executável do `techlab-diary-service`, responsável por suportar a Tool **TechLab Diary** com persistência em PostgreSQL e API REST funcional.

O serviço deve aderir ao modelo arquitetural do backend Hub SaaP e fornecer endpoints mínimos para registro e consulta de entradas do diário técnico.

---

**Context / Problem statement:**

A Tool **TechLab Diary** permite registrar conhecimento técnico produzido por desenvolvedores, incluindo:

- experimentos
- descobertas
- how-to
- lessons learned
- notas técnicas

Para suportar essa Tool é necessário um backend simples responsável por:

- persistir entradas do diário
- permitir consulta de entradas
- permitir destacar entradas relevantes
- fornecer dados para a visão inicial da Tool

Sem este serviço:

- a Tool não poderá persistir dados
- não haverá integração real entre frontend e backend

Esta issue cria a **foundation backend da Tool**.

---

**Approach (execution path):**

1. Criar projeto Spring Boot `techlab-diary-service`.
2. Implementar estrutura arquitetural padrão Hub SaaP.
3. Modelar domínio `DiaryEntry`.
4. Implementar persistência PostgreSQL.
5. Implementar endpoints REST da Tool.
6. Configurar migrations Flyway.
7. Integrar logs e observabilidade básica.

---

**Non-goals:**

- autenticação completa
- autorização completa
- multi-tenancy
- mensageria
- microserviços adicionais
- busca avançada

---

**Layer(s):**

backend / tool-service

---

**Bounded context:**

techlab-diary

---

**Implementation checklist (by layer):**

### API

Criar controller:
DiaryEntryController

Endpoints mínimos:
POST /api/v1/techlab-diary/entries
GET /api/v1/techlab-diary/entries
GET /api/v1/techlab-diary/entries/{id}
PATCH /api/v1/techlab-diary/entries/{id}/highlight
GET /api/v1/techlab-diary/dashboard/summary

---

### Application

Criar use cases:
CreateDiaryEntryUseCase
ListDiaryEntriesUseCase
GetDiaryEntryUseCase
HighlightDiaryEntryUseCase
GetDiaryDashboardSummaryUseCase

---

### Domain

Criar entidade:
DiaryEntry

Value objects sugeridos:
DiaryEntryId
DiaryEntryType
AuthorName

Regras de domínio:

- título obrigatório
- tipo obrigatório
- conteúdo obrigatório
- highlighted inicia como false

---

### Infrastructure

Implementar:
DiaryEntryRepository

Adapters:
- JPA repository
- mapper de entidade

---

### Data / Flyway

Criar migration inicial:

Tabela:
techlab_diary_entry

Campos mínimos:
id
title
entry_type
content
author_name
highlighted
created_at
updated_at

Criar índices por:
created_at
highlighted


---

### Observability

- logs estruturados
- correlationId em requests
- logs de criação de entrada

---

**Milestone:**

TechLab Diary — Backend Foundation

---

**Labels:**

type:foundation
layer:backend
service:techlab-diary-service
priority:P1

---

**Acceptance criteria:**

- serviço inicia corretamente
- migrations executadas
- tabela criada no PostgreSQL
- criação de entrada funciona
- listagem funciona
- destaque funciona
- resumo inicial funciona

---

**Dependencies:**

### External dependencies

PostgreSQL

### Internal dependencies

None

---

**Data impact:**

Schema:
techlab


Tabela:
techlab_diary_entry


---

**API / Contract impact**
POST /api/v1/techlab-diary/entries
GET /api/v1/techlab-diary/entries
GET /api/v1/techlab-diary/entries/{id}
PATCH /api/v1/techlab-diary/entries/{id}/highlight
GET /api/v1/techlab-diary/dashboard/summary

---

**Testing / Evidence required**

- build PASS
- aplicação inicializa
- migrations executadas
- endpoint de criação funciona
- endpoint de listagem funciona

---

**Risks / Notes**

Serviço deve permanecer **simples e autocontido**, evitando overengineering.
