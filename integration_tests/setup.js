const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Determine which env file to use based on the test type
const testType = process.env.TEST_TYPE || 'token';

// Define paths to look for env files
const integrationTestsDir = __dirname;
const rootDir = path.join(__dirname, '..');

// Build array of possible env file paths to check
const possibleEnvFiles = [
  // Custom env file path if specified
  process.env.ENV_FILE,
  // Check in integration_tests directory
  path.join(integrationTestsDir, `.env.integration.${testType}`),
  path.join(integrationTestsDir, '.env.integration'),
  // Check in project root directory
  path.join(rootDir, `.env.integration.${testType}`),
  path.join(rootDir, '.env.integration')
].filter(Boolean); // Remove undefined entries

// Try to load env file from one of the possible locations
let loadedEnvFile = false;

for (const envFile of possibleEnvFiles) {
  if (fs.existsSync(envFile)) {
    console.log(`Loading environment from: ${envFile}`);
    dotenv.config({ path: envFile });
    loadedEnvFile = true;
    break;
  }
}

if (!loadedEnvFile) {
  console.log('No .env file found, using existing environment variables');
  console.log('Looked for files at:');
  possibleEnvFiles.forEach(file => console.log(` - ${file}`));
}

// Set TEST_AUTH_TYPE based on TEST_TYPE if not already set
if (process.env.TEST_TYPE && !process.env.TEST_AUTH_TYPE) {
  process.env.TEST_AUTH_TYPE = process.env.TEST_TYPE;
  console.log(`Setting TEST_AUTH_TYPE to: ${process.env.TEST_AUTH_TYPE}`);
}

// Set longer timeout for integration tests
jest.setTimeout(30000); // 30 seconds timeout for integration tests

// Log the auth type being used
console.log(`Running integration tests with auth type: ${process.env.TEST_AUTH_TYPE || 'token'}`);
