module.exports = {
  extension: ['ts'],
  spec: 'tests/**/*.test.ts',
  require: ['reflect-metadata', 'tsx/esm', 'sinon-chai'],
  timeout: 5000,
  reporter: 'spec',
  ui: 'bdd',
  recursive: true,
  // Exclude legacy tests directory
  ignore: ['tests/_legacy/**/*', 'tests/shared/config/enhanced.config.test.ts', 'tests/shared/config/enhanced.config.isolated.test.ts','tests/shared/config/enhanced.config.fixed.test.ts']
};
