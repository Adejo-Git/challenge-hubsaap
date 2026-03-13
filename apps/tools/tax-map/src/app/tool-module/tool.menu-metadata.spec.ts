import {
  EXAMPLE_TOOL_MENU_METADATA,
} from './tool.menu-metadata';
import {
  validateToolMenuMetadata,
} from '@hub/tool-contract';

describe('Example Tool - ToolMenuMetadata', () => {
  it('should have valid ToolMenuMetadata', () => {
    const validation = validateToolMenuMetadata(EXAMPLE_TOOL_MENU_METADATA);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('should have toolKey defined', () => {
    expect(EXAMPLE_TOOL_MENU_METADATA.toolKey).toBe('tax-map');
  });

  it('should have displayName defined', () => {
    expect(EXAMPLE_TOOL_MENU_METADATA.displayName).toBe('Example Tool');
  });

  it('should have menu items', () => {
    expect(EXAMPLE_TOOL_MENU_METADATA.menuItems.length).toBeGreaterThan(0);
  });

  it('should have deep links', () => {
    expect(EXAMPLE_TOOL_MENU_METADATA.deepLinks?.length).toBeGreaterThan(0);
  });

  it('should have only relative paths in menu items', () => {
    const hasAbsolutePath = EXAMPLE_TOOL_MENU_METADATA.menuItems.some(
      (item: { path?: string }) => item.path?.startsWith('/tools/')
    );
    expect(hasAbsolutePath).toBe(false);
  });

  it('should have only relative paths in deep links', () => {
    const hasAbsolutePath = EXAMPLE_TOOL_MENU_METADATA.deepLinks?.some(
      (link: { path: string }) => link.path.startsWith('/tools/')
    );
    expect(hasAbsolutePath).toBe(false);
  });
});
