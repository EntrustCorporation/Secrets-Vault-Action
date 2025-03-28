const fs = require('fs');
const path = require('path');

/**
 * Reads configuration from environment variables
 * @returns {Object} - Configuration object
 */
function getConfig() {
  // Read directly from environment variables (loaded by dotenv in setup.js)
  return {
    baseUrl: process.env.TEST_BASE_URL,
    authType: process.env.TEST_AUTH_TYPE || 'token',
    apiToken: process.env.TEST_API_TOKEN,
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
    vaultUid: process.env.TEST_VAULT_UID,
    boxId: process.env.TEST_BOX_ID,
    secretId: process.env.TEST_SECRET_ID,
    caCert: process.env.TEST_CA_CERT
  };
}

module.exports = { getConfig };
