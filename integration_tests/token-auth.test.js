const fs = require('fs');
const path = require('path');
const os = require('os');
const core = require('@actions/core');
const { createAuthenticator } = require('../src/auth');
const { getConfig } = require('./config-reader');

// Mock core functions
jest.mock('@actions/core', () => {
  const originalCore = jest.requireActual('@actions/core');
  return {
    ...originalCore,
    getInput: jest.fn(),
    setSecret: jest.fn(),
    info: jest.fn()
  };
});

describe('Token Authentication Integration Test', () => {
  let config;
  let tempCertPath = null;

  beforeAll(() => {
    // Get configuration
    config = getConfig();
    
    // Skip tests if not running token auth tests
    if (process.env.TEST_AUTH_TYPE === 'userpass') {
      console.log('Skipping token auth tests when running in userpass mode');
      return;
    }
    
    if (!config.baseUrl || !config.apiToken || !config.boxId || !config.secretId) {
      throw new Error('Missing required configuration for token auth test. ' +
        'Required: baseUrl, apiToken, boxId, secretId');
    }
    
    // Mock core.getInput for token auth
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'auth_type': 'token',
        'api_token': config.apiToken,
        'base_url': config.baseUrl,
        'ca_cert': config.caCert || ''
      };
      return inputs[name] || '';
    });
  });

  afterAll(() => {
    // Clean up temp file if it was created
    if (tempCertPath && fs.existsSync(tempCertPath)) {
      try {
        fs.unlinkSync(tempCertPath);
      } catch (err) {
        console.error(`Failed to clean up temporary certificate file: ${err.message}`);
      }
    }
  });

  test('should successfully authenticate with token', async () => {
    // Skip test if not running token auth tests
    if (process.env.TEST_AUTH_TYPE === 'userpass') {
      console.log('Skipping token auth test');
      return;
    }

    // Initialize authenticator
    const authenticator = createAuthenticator({
      baseUrl: config.baseUrl,
      timeout: 10000
    });

    // Get auth headers
    const authHeaders = await authenticator.getAuthHeaders();

    // Check headers structure
    expect(authHeaders).toHaveProperty('X-Vault-Auth');
    expect(authHeaders).toHaveProperty('Content-Type');
    expect(authHeaders['Content-Type']).toBe('application/json');
  });
});
