# PatternsTimeline

Pattern reutilizável para exibir trilhas de atividade/auditoria com ordenação, agrupamento, filtros simples e estados padronizados.

## Objetivo

- Renderizar timeline legível e consistente para eventos de domínio genéricos.
- Padronizar UX de `loading`, `empty`, `error`.
- Permitir customização por templates (`header/body/footer`) sem fork.
- Manter o componente agnóstico de domínio e sem `HTTP`.

## API pública (spec)

### Inputs

- `items: TimelineItem[]`
- `groupBy: 'none' | 'day' | 'actor' | 'type'`
- `sortDirection: 'desc' | 'asc'` (`desc` padrão)
- `filters: FilterConfig`
- `renderers: RendererTemplates`
- `state: 'loading' | 'ready' | 'empty' | 'error'`
- `error?: StandardError`
- `uiOptions: { compact, showAvatars, showTags, maxItems, stickyGroupHeaders, dayGroupingTimezone, enableVirtualScroll, virtualScrollMinItems, virtualScrollItemSize, virtualScrollHeightPx }`

### Comportamentos importantes

- `groupBy: 'day'` agrupa por dia conforme `uiOptions.dayGroupingTimezone` (`local` padrão, ou `utc`).
- `uiOptions.maxItems` limita a quantidade de itens renderizados no DOM; quando houver mais itens que o limite, o componente exibe botão `Carregar mais` e emite `loadMore`.
- `uiOptions.stickyGroupHeaders` ativa cabeçalhos de grupo sticky.
- Virtual scroll nativo é ativado automaticamente para listas grandes (threshold padrão: `200` itens visíveis) e pode ser ajustado por `uiOptions.virtualScrollMinItems`.

### Outputs

- `filterChange`: emite alteração de filtro (`type/tag/actor`)
- `itemClick`: emite item selecionado
- `loadMore`: emite solicitação de paginação incremental

## Exemplo mínimo

```html
<patterns-timeline
	[items]="timelineItems"
	[groupBy]="'day'"
	[sortDirection]="'desc'"
	[state]="state"
	[error]="error"
	(filterChange)="onFilterChange($event)"
	(itemClick)="onItemClick($event)"
	(loadMore)="onLoadMore()"
></patterns-timeline>
```

## Templates customizados

O consumer pode fornecer templates opcionais para customizar render:

- `itemHeader`
- `itemBody`
- `itemFooter`

Quando não houver `itemFooter` customizado, o componente renderiza timestamp formatado no footer padrão.

## Contrato de erro

`error` segue `StandardError` com, no mínimo, `message` e metadados opcionais (`code`, `category`, `correlationId`).

`StandardError` é consumido do contrato compartilhado `@hub/error-model`.

## Limites do pattern

Este pattern **não**:

- busca dados;
- decide política de auditoria/autorização;
- persiste estado complexo de filtro;
- substitui tabela de logs avançada (`patterns-smart-table`).

## Filtros

Os filtros são recebidos via input `filters` (controle externo) e o evento `filterChange` permite notificar alterações quando o consumer optar por orquestrar mudanças a partir do componente.

Este pattern não fornece, por padrão, barra/controles visuais de filtros; essa UI é responsabilidade do consumer para manter composição flexível por tool.

## Segurança e sanitização

Sanitização completa de conteúdo sensível é responsabilidade do consumer antes de enviar `items`.

## Performance para grandes volumes

- Para volumes muito grandes (ex.: milhares de itens), o componente usa `CdkVirtualScrollViewport` quando `enableVirtualScroll !== false` e o threshold configurado for atingido.
- Você pode ajustar `virtualScrollItemSize` (altura por linha) e `virtualScrollHeightPx` (altura do viewport).
- Para cenários remotos, combine virtual scroll com paginação incremental no consumer via `loadMore`.
