module.exports = {
  displayName: 'integration',
  testMatch: ['**/integration_tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/integration_tests/setup.js'],
  testTimeout: 30000
};
