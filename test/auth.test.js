// Mock dependencies
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setSecret: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}), { virtual: true });

jest.mock('axios');

const axios = require('axios');
const core = require('@actions/core');
const { createAuthenticator } = require('../src/auth');

describe('Authentication Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for token auth type
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'auth_type': 'token',
        'api_token': 'test-token',
        'base_url': 'https://vault-api.example.com'
      };
      return inputs[name] || '';
    });
    
    // Reset and prepare axios mock
    axios.post = jest.fn().mockResolvedValue({
      data: {
        access_token: 'test-access-token',
        expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      }
    });
  });

  test('creates token authenticator by default', async () => {
    const authenticator = createAuthenticator({ baseUrl: 'https://vault-api.example.com' });
    expect(authenticator.constructor.name).toBe('TokenAuthenticator');
    
    const headers = await authenticator.getAuthHeaders();
    expect(headers).toEqual({
      'X-Vault-Auth': 'test-token',
      'Content-Type': 'application/json'
    });
  });

  test('creates userpass authenticator when specified', async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'auth_type': 'userpass',
        'username': 'test-user',
        'password': 'test-password',
        'vault_uid': 'test-vault-id',
        'base_url': 'https://vault-api.example.com'
      };
      return inputs[name] || '';
    });
    
    const authenticator = createAuthenticator({ baseUrl: 'https://vault-api.example.com' });
    expect(authenticator.constructor.name).toBe('UserPassAuthenticator');
    
    const headers = await authenticator.getAuthHeaders();
    expect(axios.post).toHaveBeenCalledWith(
      'https://vault-api.example.com/vault/1.0/Login/test-vault-id/',
      { username: 'test-user', password: 'test-password' },
      expect.any(Object)
    );
    
    expect(headers).toEqual({
      'X-Vault-Auth': 'test-access-token',
      'Content-Type': 'application/json'
    });
    
    expect(core.setSecret).toHaveBeenCalledWith('test-access-token');
  });

  test('handles authentication failure', async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'auth_type': 'userpass',
        'username': 'test-user',
        'password': 'wrong-password',
        'vault_uid': 'test-vault-id',
        'base_url': 'https://vault-api.example.com'
      };
      return inputs[name] || '';
    });
    
    axios.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { error: 'Invalid credentials' }
      }
    });
    
    const authenticator = createAuthenticator({ baseUrl: 'https://vault-api.example.com' });
    await expect(authenticator.getAuthHeaders()).rejects.toThrow('Authentication failed');
  });
});
