import { ToolContextAdapter } from './tool-context-adapter';

describe('ToolContextAdapter - comportamentos de robustez', () => {
  it('não quebra quando featureFlagService é undefined (safe handling)', () => {
    const adapter = new ToolContextAdapter(undefined, undefined, undefined, undefined);

    // Chamadas públicas que usam featureFlagService devem executar sem lançar
    expect(() => adapter.refreshCapabilities('tax-map')).not.toThrow();
    expect(() => adapter.contextSnapshot('tax-map')).not.toThrow();
  });
});
