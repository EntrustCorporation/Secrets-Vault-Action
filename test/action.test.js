// Mock dependencies before requiring any modules
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  setSecret: jest.fn(),
  exportVariable: jest.fn(),
  addPath: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}), { virtual: true });

jest.mock('axios');
jest.mock('fs');
jest.mock('path');
jest.mock('os');

const axios = require('axios');
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { run } = require('../src/action');

// Save original implementations to restore later
const originalWriteFileSync = fs.writeFileSync;
const originalReadFileSync = fs.readFileSync;
const originalExistsSync = fs.existsSync;
const originalUnlinkSync = fs.unlinkSync;

describe('Secrets Vault Action', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup default input values
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'base_url': 'https://secrets-api.example.com',
        'api_token': 'mock-token',
        'box_id': 'mock-box-id',
        'secret_id': 'mock-secret-id',
        'ca_cert': ''
      };
      return inputs[name] || '';
    });
    
    // Mock filesystem operations
    fs.writeFileSync = jest.fn();
    fs.readFileSync = jest.fn(() => 'mock-cert-content');
    fs.existsSync = jest.fn(() => true);
    fs.unlinkSync = jest.fn();
    
    // Mock os.tmpdir
    os.tmpdir = jest.fn().mockReturnValue('/tmp');
    
    // Mock path.join
    path.join = jest.fn(() => '/tmp/mock-cert.pem');
    
    // Reset and prepare axios mock
    axios.post = jest.fn().mockResolvedValue({
      data: {
        secret_data: 'test-secret-value'
      },
      status: 200
    });
  });

  afterAll(() => {
    // Restore original implementations
    fs.writeFileSync = originalWriteFileSync;
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.unlinkSync = originalUnlinkSync;
  });

  test('fetches secret successfully', async () => {
    // Execute the run function
    const result = await run();

    // Verify axios was called with the right parameters
    expect(axios.post).toHaveBeenCalledWith(
      'https://secrets-api.example.com/vault/1.0/CheckoutSecret/',
      {
        box_id: 'mock-box-id',
        secret_id: 'mock-secret-id'
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Vault-Auth': 'mock-token',
          'Content-Type': 'application/json'
        }),
        timeout: 10000
      })
    );

    // Verify the secret was properly processed
    expect(core.setSecret).toHaveBeenCalledWith('test-secret-value');
    expect(core.setOutput).toHaveBeenCalledWith('secret', 'test-secret-value');
    expect(result).toBe('test-secret-value');
  });

  test('handles API error correctly', async () => {
    // Mock an API error
    axios.post.mockRejectedValueOnce(new Error('API Error'));

    // Execute and expect it to throw
    await expect(run()).rejects.toThrow('Failed to fetch secret: API Error');
    expect(core.setFailed).toHaveBeenCalledWith('Failed to fetch secret: API Error');
  });

  test('handles CA certificate correctly', async () => {
    // Enable CA cert in mock
    core.getInput = jest.fn().mockImplementation((name) => {
      const inputs = {
        'base_url': 'https://secrets-api.example.com',
        'api_token': 'mock-token',
        'box_id': 'mock-box-id',
        'secret_id': 'mock-secret-id',
        'ca_cert': 'base64-encoded-cert'
      };
      return inputs[name] || '';
    });

    // Execute the run function
    await run();

    // Verify certificate handling
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();
  });
});
