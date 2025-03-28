const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const core = require('@actions/core');
const { createAuthenticator } = require('../src/auth');
const { getConfig } = require('./config-reader');
const { fetchSecretFromVault } = require('../src/action');

// Mock core functions
jest.mock('@actions/core', () => {
  const originalCore = jest.requireActual('@actions/core');
  return {
    ...originalCore,
    getInput: jest.fn(),
    setSecret: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    exportVariable: jest.fn()
  };
});

describe('Secret Fetch Integration Test', () => {
  let config;
  let tempCertPath = null;
  let httpsAgent = undefined;

  beforeAll(() => {
    // Get configuration
    config = getConfig();
    
    // Ensure the auth type is appropriate for this test
    const currentAuthType = process.env.TEST_AUTH_TYPE || 'token';
    
    if (!config.baseUrl || !config.boxId || !config.secretId) {
      throw new Error('Missing required configuration for secret fetch test. ' +
        'Required: baseUrl, boxId, secretId');
    }

    // Setup appropriate mocks based on auth type
    if (currentAuthType === 'token') {
      if (!config.apiToken) {
        throw new Error('Missing required apiToken for token auth');
      }
      
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'auth_type': 'token',
          'api_token': config.apiToken,
          'base_url': config.baseUrl,
          'ca_cert': config.caCert || ''
        };
        return inputs[name] || '';
      });
    } else if (currentAuthType === 'userpass') {
      if (!config.username || !config.password || !config.vaultUid) {
        throw new Error('Missing required username, password or vaultUid for userpass auth');
      }
      
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
    } else {
      throw new Error(`Unsupported auth type: ${currentAuthType}`);
    }

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

  test(`should fetch secret with ${process.env.TEST_AUTH_TYPE || 'token'} authentication`, async () => {
    // Skip test if we don't have the right auth setup
    const currentAuthType = process.env.TEST_AUTH_TYPE || 'token';
    if (currentAuthType === 'token' && !config.apiToken) {
      console.log('Skipping token secret fetch test in userpass mode');
      return;
    }
    if (currentAuthType === 'userpass' && (!config.username || !config.password)) {
      console.log('Skipping userpass secret fetch test in token mode');
      return;
    }

    // Create authenticator
    const authenticator = createAuthenticator({
      baseUrl: config.baseUrl,
      httpsAgent,
      timeout: 10000
    });

    // Fetch a secret using the real function from action.js
    const secretValue = await fetchSecretFromVault(config.boxId, config.secretId, authenticator, config.baseUrl, httpsAgent);
    
    // Validate secret value without exposing it
    expect(secretValue).toBeDefined();
    expect(typeof secretValue).toBe('string');
    expect(secretValue.length).toBeGreaterThan(0);
  });
});
