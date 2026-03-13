document_type: challenge-artifact
artifact: techlab-diary-challenge-specification
title: Hub SaaP Challenge — TechLab Diary Tool
owner: platform-architecture
status: active
language: pt-BR
scope: hubsaap-challenge
version: 1.0

# Hub SaaP Engineering Challenge
## TechLab Diary Tool

Este documento define **o domínio mínimo e os requisitos funcionais mínimos** do desafio técnico utilizado para avaliar candidatos que irão trabalhar na plataforma **Hub SaaP**.

O objetivo do desafio é avaliar a capacidade do candidato de:

- compreender uma arquitetura existente
- integrar uma nova Tool em uma plataforma frontend já estruturada
- propor uma arquitetura backend coerente
- implementar uma solução funcional simples
- comunicar decisões arquiteturais com clareza

Este documento **não define a solução arquitetural**.
O candidato deve propor a arquitetura da solução.

---

# Documento 1 — Domínio Mínimo da Tool

## 1. Nome da Tool

**TechLab Diary**

---

## 2. Propósito da Tool

O **TechLab Diary** é uma ferramenta interna utilizada por desenvolvedores para registrar conhecimento técnico gerado durante o trabalho.

Seu objetivo é permitir que membros do time registrem:

- experimentos técnicos
- descobertas relevantes
- modos de fazer
- aprendizados recorrentes
- anotações técnicas importantes

A Tool funciona como um **diário técnico coletivo** do time.

---

## 3. Conceito Central

O conceito central da ferramenta é a **entrada de diário técnico**.

Cada entrada representa um registro criado por um desenvolvedor contendo conhecimento prático ou aprendizado técnico.

---

## 4. Entidade Principal

### DiaryEntry

Representa uma entrada registrada no diário técnico.

Campos mínimos esperados:
id
title
entryType
content
authorName
highlighted
createdAt
updatedAt


---

## 5. Descrição dos Campos

### id
Identificador único da entrada.

---

### title
Título curto da entrada.

Exemplos:

- "Experimento com Angular Signals"
- "Como configurar Flyway em ambiente local"

---

### entryType

Tipo da entrada registrada.

Valores sugeridos:
EXPERIMENT
DISCOVERY
HOW_TO
LESSON_LEARNED
NOTE

O candidato pode ajustar ou expandir esses valores se julgar apropriado.

---

### content

Conteúdo principal da entrada.

Pode conter:

- explicação do experimento
- descrição do problema
- solução encontrada
- observações técnicas
- exemplos de uso

Não há restrições formais sobre o formato.

---

### authorName

Nome do desenvolvedor que registrou a entrada.

---

### highlighted

Indica se a entrada foi marcada como **importante** para consulta futura.

Entradas destacadas podem aparecer em áreas de destaque da Tool.

---

### createdAt

Data de criação da entrada.

---

### updatedAt

Data da última atualização da entrada.

---

## 6. Regras de Domínio Mínimas

As seguintes regras devem existir no domínio:

- `title` é obrigatório
- `entryType` é obrigatório
- `content` é obrigatório
- `authorName` é obrigatório
- `highlighted` inicia como `false`
- entradas podem ser destacadas posteriormente
- `createdAt` deve ser definido na criação
- `updatedAt` deve refletir alterações posteriores

---

## 7. Evoluções Futuras (fora do escopo)

A ferramenta poderia evoluir futuramente para incluir:

- comentários em entradas
- tags técnicas
- busca textual
- anexos
- votação de utilidade
- integração com IA

Esses itens **não fazem parte do desafio**.

---

# Documento 2 — Requisitos Funcionais Mínimos

Este documento define **o comportamento mínimo esperado da Tool**.

O candidato pode expandir a solução, mas deve atender ao mínimo definido aqui.

---

## 1. Criar Entrada

O usuário deve ser capaz de criar uma nova entrada no diário técnico.

Uma nova entrada deve conter pelo menos:
title
entryType
content
authorName


Após a criação, a entrada deve ser persistida.

---

## 2. Listar Entradas

A Tool deve permitir visualizar uma lista de entradas registradas.

A listagem deve exibir pelo menos:
title
entryType
authorName
createdAt
highlighted


A forma de apresentação fica a critério do candidato.

---

## 3. Visualizar Detalhe de Entrada

O usuário deve poder visualizar uma entrada completa.

A visualização deve mostrar:

- título
- tipo
- autor
- data de criação
- conteúdo completo

---

## 4. Destacar Entrada

O usuário deve poder marcar uma entrada como **destacada**.

Quando destacada:
highlighted = true


Essa alteração deve ser persistida.

Também deve ser possível remover o destaque.

---

## 5. Visão Inicial da Tool

A Tool deve possuir uma **visão inicial simples**.

Essa tela deve apresentar pelo menos:

- total de entradas registradas
- entradas destacadas
- entradas mais recentes

A forma de apresentação é livre.

---

## 6. Persistência

Os dados devem ser persistidos em **PostgreSQL**.

O candidato deve propor:

- o modelo físico da tabela
- a forma de acesso aos dados
- a estrutura de persistência

---

## 7. API Backend

A Tool deve possuir um backend funcional.

O candidato deve definir:

- endpoints da API
- modelo de requests
- modelo de responses
- organização das rotas

A API deve permitir:

- criação de entrada
- listagem de entradas
- consulta de entrada
- atualização de destaque
- consulta de resumo da Tool

---

## 8. Integração com o Frontend Hub SaaP

A Tool deve ser integrada ao **frontend existente do Hub SaaP**.

A integração deve respeitar os seguintes princípios:

- o Shell não deve ser alterado estruturalmente
- a Tool deve funcionar como aplicação hospedada pelo Shell
- a Tool não deve criar dependência com outras Tools
- a Tool deve consumir backend real

---

## 9. Documentação Esperada do Candidato

O candidato deve entregar:

### architecture.md

Explicando:

- arquitetura frontend da Tool
- arquitetura backend proposta
- modelo de domínio
- decisões arquiteturais
- limitações
- possíveis evoluções

---

### README.md

Explicando:

- como executar frontend
- como executar backend
- como configurar PostgreSQL
- decisões de implementação
- melhorias futuras

---

## 10. Fora do Escopo

Os seguintes itens **não são obrigatórios**:

- autenticação completa
- autorização completa
- multi-tenancy
- deploy em cloud
- observabilidade avançada
- testes automatizados completos
- design system completo

Esses itens podem ser mencionados como evolução futura.

---

# Objetivo Final do Desafio

O desafio existe para avaliar:

- compreensão arquitetural
- clareza de modelagem
- capacidade de integração
- pragmatismo técnico
- comunicação de decisões de engenharia

A solução esperada deve ser **simples, clara e funcional**.
