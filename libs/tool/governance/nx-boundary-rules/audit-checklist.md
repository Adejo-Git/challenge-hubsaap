# Checklist de auditoria — Nx Boundary Rules

Passos rápidos para revisão de PR / criação de lib:

1. Confirmar tag proposta (ex.: `type:tool`, `scope:<toolKey>`) em `nx-tags.catalog.json`.
2. Verificar `dep-constraints.catalog.json` para garantir dependências permitidas.
3. Executar lint localmente com snippet aplicado e corrigir violations:

```bash
npx nx lint --fix
```

4. Se houver violation, seguir um destes caminhos:
   - Criar `type:contracts` (facade/adapter) e mover a dependência para lá.
   - Mover código compartilhado para `type:shared` se for genérico.
   - Ajustar scope para `scope:<toolKey>` se a dependência for internal à tool.

5. Documentar no PR a decisão (porque a tag escolhida é correta) e anexar evidências (outputs do lint / correções).

6. Validar CI: confirmar que o pipeline de lint falha em violations e que o PR só é aprovado após ajustes.

Observações:
- Não usar `// eslint-disable` para contornar rules de boundary. Sempre criar contract / facade quando precisar quebrar boundary.
