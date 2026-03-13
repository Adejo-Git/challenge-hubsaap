import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { BUTTON_SIZES, BUTTON_VARIANTS, DEFAULT_BUTTON_CONFIG } from './button/button.model';
import { ICON_BUTTON_SIZES, ICON_BUTTON_VARIANTS } from './icon-button/icon-button.model';
import { DEFAULT_MODAL_A11Y, MODAL_SIZES } from './modal/modal.model';
import { TOAST_POSITIONS, TOAST_VARIANTS } from './toast/toast.model';

const readLocalFile = (relativePath: string): string => {
    return readFileSync(join(__dirname, relativePath), 'utf8');
};

const listSourceFiles = (relativeDir = '.'): string[] => {
    const absoluteDir = join(__dirname, relativeDir);
    const entries = readdirSync(absoluteDir, { withFileTypes: true });

    return entries.flatMap((entry) => {
        const relativePath = join(relativeDir, entry.name);
        const absolutePath = join(__dirname, relativePath);

        if (entry.isDirectory()) {
            return listSourceFiles(relativePath);
        }

        if (entry.isFile() && absolutePath.endsWith('.ts') && !absolutePath.endsWith('.spec.ts')) {
            return [relativePath.replace(/\\/g, '/')];
        }

        return [];
    });
};

describe('UiComponents', () => {
    it('should expose consistent primitive APIs for variant/size/state', () => {
        expect(BUTTON_VARIANTS).toEqual(['primary', 'secondary', 'danger', 'ghost']);
        expect(BUTTON_SIZES).toEqual(['sm', 'md', 'lg']);
        expect(DEFAULT_BUTTON_CONFIG.state).toBe('default');

        expect(ICON_BUTTON_VARIANTS).toEqual(['primary', 'secondary', 'danger', 'ghost']);
        expect(ICON_BUTTON_SIZES).toEqual(['sm', 'md', 'lg']);
    });

    it('should expose overlay and feedback contracts', () => {
        expect(MODAL_SIZES).toEqual(['sm', 'md', 'lg']);
        expect(DEFAULT_MODAL_A11Y.role).toBe('dialog');
        expect(DEFAULT_MODAL_A11Y.trapFocus).toBe(true);
        expect(DEFAULT_MODAL_A11Y.closeOnEscape).toBe(true);

        expect(TOAST_VARIANTS).toEqual(['info', 'success', 'warning', 'error']);
        expect(TOAST_POSITIONS).toEqual(['top-right', 'top-left', 'bottom-right', 'bottom-left']);
    });

    it('should keep primitive and overlay styles tokenized without hardcoded color or size literals', () => {
        const styleFiles = [
            'alert/alert.styles.scss',
            'badge/badge.styles.scss',
            'button/button.styles.scss',
            'card/card.styles.scss',
            'divider/divider.styles.scss',
            'icon/icon.styles.scss',
            'icon-button/icon-button.styles.scss',
            'link/link.styles.scss',
            'modal/modal.styles.scss',
            'tag/tag.styles.scss',
            'toast/toast.styles.scss',
            'widget/widget.styles.scss',
        ];

        styleFiles.forEach((filePath) => {
            const content = readLocalFile(filePath);

            expect(content).not.toMatch(/#[0-9a-f]{3,8}\b/i);
            expect(content).not.toMatch(/rgba?\(/i);
            expect(content).not.toMatch(/\b\d+px\b/i);
            expect(content).toContain('var(--');
        });
    });

    it('should export only explicit public api from root index', () => {
        const indexContent = readLocalFile('index.ts');

        expect(indexContent).not.toContain('export * from');
        expect(indexContent).toContain("export type { ButtonVariant, ButtonSize, ButtonConfig } from './button/button.model';");
        expect(indexContent).toContain("export { MODAL_SIZES, DEFAULT_MODAL_A11Y } from './modal/modal.model';");
        expect(indexContent).toContain("export { TOAST_VARIANTS, TOAST_POSITIONS } from './toast/toast.model';");
        expect(indexContent).toMatch(new RegExp("createModalFocusTrap[\\s\\S]*getModalFocusableElements[\\s\\S]*handleModalKeyboardNavigation[\\s\\S]*from './modal/modal-a11y';"));
    });

    it('should keep shared boundaries without imports from apps/tools', () => {
        const sourceFiles = listSourceFiles();

        sourceFiles.forEach((filePath) => {
            const content = readLocalFile(filePath);
            expect(content).not.toMatch(/from\s+['"](apps\/|libs\/tools\/|@.*tools)/i);
        });
    });

    it('should keep ui components free from access decision logic and sensitive tokens', () => {
        const sourceFiles = listSourceFiles();

        sourceFiles.forEach((filePath) => {
            const content = readLocalFile(filePath);
            expect(content).not.toMatch(/hasRole\(|permission\s*[:=]|jwt|access[_-]?token/i);
        });
    });
});
