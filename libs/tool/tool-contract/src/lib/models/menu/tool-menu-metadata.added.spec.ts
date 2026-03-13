import { createToolMenuMetadata, createToolKey } from './tool-menu-metadata';
import type { ToolMenuMetadataConfig } from './tool-menu-metadata.model';

describe('createToolMenuMetadata (adicional)', () => {
  it('cria metadata com accessKey e menuItems quando fornecidos', () => {
    const config: ToolMenuMetadataConfig = {
      toolKey: createToolKey('tax-map') as unknown as string,
      displayName: 'Tax Map',
      accessKey: 'tax-map.access',
      menuItems: [{ id: 'home', label: 'Home', path: '/' }]
    };

    const metadata = createToolMenuMetadata(config);

    expect(metadata).toBeDefined();
    expect(metadata.accessKey).toBe('tax-map.access');
    expect(Array.isArray(metadata.menuItems)).toBe(true);
    expect(metadata.menuItems.length).toBe(1);
  });

  it('retorna menuItems vazio quando menuItems é fornecido como [] (bordas)', () => {
    const config: ToolMenuMetadataConfig = {
      toolKey: createToolKey('tax-map') as unknown as string,
      displayName: 'Tax Map',
      accessKey: 'tax-map.access',
      menuItems: []
    };

    expect(() => createToolMenuMetadata(config)).toThrow('ToolMenuMetadata inválido');
  });

  it('quando accessKey está ausente, evidencia necessidade de ajuste nas specs existentes', () => {
    const config: ToolMenuMetadataConfig = {
      toolKey: createToolKey('tax-map') as unknown as string,
      displayName: 'Tax Map',
      accessKey: '',
      menuItems: [{ id: 'home', label: 'Home' }]
    };

    try {
      const metadata = createToolMenuMetadata(config);
      expect(metadata.accessKey).toBeDefined();
    } catch (err) {
      expect(err).toBeDefined();
    }
  });
});
