const path = require('path');
const fs = require('fs');

// Keep using <rootDir>-based mappings (like other ui libs) to match working patterns
const workspaceRoot = path.resolve(__dirname, '../../../../');
const tsconfigPath = path.resolve(workspaceRoot, 'tsconfig.base.json');
let compilerOptions = {};
if (fs.existsSync(tsconfigPath)) {
  const ts = require(tsconfigPath);
  compilerOptions = ts.compilerOptions || {};
}

function buildRootRelativeMapper(paths) {
  const mapper = {};
  for (const key in paths) {
    const targets = paths[key];
    if (!Array.isArray(targets) || targets.length === 0) continue;
    const target = targets[0];
    if (key.endsWith('/*')) {
      const prefix = key.replace(/\*$/, '(.*)');
      const mapped = target.replace(/\*$/, '$1');
      // Use <rootDir>/../../../../ + target to match other ui libs
      mapper[`^${prefix}$`] = `<rootDir>/../../../../${mapped}`;
    } else {
      mapper[`^${key}$`] = `<rootDir>/../../../../${target}`;
    }
  }
  return mapper;
}

const moduleNameMapper = buildRootRelativeMapper(compilerOptions.paths || {});

module.exports = {
  displayName: 'audit-ui-helpers',
  // use the same relative preset style as other working ui libs
  preset: '../../../../jest.preset.js',
  // use root-relative coverage path like other libs
  coverageDirectory: '<rootDir>/../../../../coverage/libs/shared/ui/audit-ui-helpers',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
  moduleNameMapper,
};
