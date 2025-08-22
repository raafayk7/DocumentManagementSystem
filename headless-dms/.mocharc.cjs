module.exports = {
  extension: ['ts'],
  spec: 'tests/**/*.test.ts',
  require: ['reflect-metadata', 'tsx/esm'],
  timeout: 5000,
  reporter: 'spec',
  ui: 'bdd',
  recursive: true,
  // Exclude legacy tests directory
  ignore: ['tests/_legacy/**/*']
};
