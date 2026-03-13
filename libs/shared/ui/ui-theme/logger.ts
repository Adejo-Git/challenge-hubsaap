// Internal logger for tests: appends to Validator/logs/ui-theme.log when running in Node.
// This helper is defensive and will noop in browser environments.
// Declares to satisfy TS in environments where global `require` and `process` are not typed.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const require: any; // runtime check guards usage
declare const process: any; // runtime check guards usage

export function internalLog(message: string, data?: any): void {
  try {
    // Use dynamic require to avoid bundlers bundling 'fs' for browser builds.
    // Only run when running in Node-like environment where require is defined.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = typeof require !== 'undefined' ? require('fs') : null;
    const path = typeof require !== 'undefined' ? require('path') : null;
    if (!fs || !path) {
      return;
    }

    // Ensure the Validator/logs directory exists relative to workspace root.
    // Use process.cwd() as workspace root in test environment.
    const logsDir = path.join(process.cwd(), 'Validator', 'logs');
    if (!fs.existsSync(logsDir)) {
      try {
        fs.mkdirSync(logsDir, { recursive: true });
      } catch {
        // noop
      }
    }

    const filePath = path.join(logsDir, 'ui-theme.log');
    const timestamp = new Date().toISOString();
    const payload = typeof data === 'string' ? data : JSON.stringify(data, (k, v) => {
      // avoid circular
      if (typeof v === 'function') return `[function ${v.name || 'anonymous'}]`;
      return v;
    }, 2);

    const line = `[${timestamp}] ${message}` + (data ? `\n${payload}` : '') + '\n';

    fs.appendFileSync(filePath, line, { encoding: 'utf8' });
  } catch {
    // noop: never throw from logger
  }
}
