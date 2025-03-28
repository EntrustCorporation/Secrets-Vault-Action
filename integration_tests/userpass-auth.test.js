const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
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
    info: jest.fn(),
    error: jest.fn()
  };
});

describe('Username/Password Authentication Integration Test', () => {
  let config;
  let tempCertPath = null;
  let httpsAgent = undefined;

  beforeAll(() => {
    // Get configuration
    config = getConfig();
    
    // Skip tests if not running userpass auth tests
    if (process.env.TEST_AUTH_TYPE !== 'userpass') {
      console.log('Skipping userpass auth tests when not in userpass mode');
      return;
    }
    
    if (!config.baseUrl || !config.username || !config.password || 
        !config.vaultUid || !config.boxId || !config.secretId) {
      throw new Error('Missing required configuration for userpass auth test. ' +
        'Required: baseUrl, username, password, vaultUid, boxId, secretId');
    }

    // Mock core.getInput for userpass auth
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'auth_type': 'userpass',
        'username': config.username,
        'password': config.password,
        'vault_uid': config.vaultUid,
        'base_url': config.baseUrl,
        'ca_cert': config.caCert || ''
      };
      return inputs[name] || '';
    });

    // Setup HTTPS agent if CA cert is provided
    if (config.caCert) {
      const certBuffer = Buffer.from(config.caCert, 'base64');
      tempCertPath = path.join(os.tmpdir(), `ca-cert-${Date.now()}.pem`);
      fs.writeFileSync(tempCertPath, certBuffer);
      httpsAgent = new https.Agent({
        ca: fs.readFileSync(tempCertPath)
      });
    }
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

  test('should successfully authenticate with username and password', async () => {
    // Skip test if not running userpass auth tests
    if (process.env.TEST_AUTH_TYPE !== 'userpass') {
      console.log('Skipping userpass auth test');
      return;
    }

    // Initialize authenticator
    const authenticator = createAuthenticator({
      baseUrl: config.baseUrl,
      httpsAgent,
      timeout: 10000
    });

    // Get auth headers which will trigger authentication
    const authHeaders = await authenticator.getAuthHeaders();

    // Check headers structure
    expect(authHeaders).toHaveProperty('X-Vault-Auth');
    expect(authHeaders).toHaveProperty('Content-Type');
    expect(authHeaders['Content-Type']).toBe('application/json');
  });
});
