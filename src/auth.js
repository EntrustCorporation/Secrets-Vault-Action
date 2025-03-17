const core = require('@actions/core');
const axios = require('axios');

/**
 * Factory function to create the appropriate authenticator
 * @param {Object} config Configuration object with auth details
 * @return {Object} Authenticator instance
 */
function createAuthenticator(config) {
  const authType = core.getInput('auth_type') || 'token';
  
  switch (authType.toLowerCase()) {
    case 'token':
      return new TokenAuthenticator(config);
    case 'userpass':
      return new UserPassAuthenticator(config);
    default:
      throw new Error(`Unsupported authentication type: ${authType}`);
  }
}

/**
 * Base class for all authenticators
 */
class BaseAuthenticator {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.httpsAgent = config.httpsAgent;
    this.timeout = config.timeout || 10000;
  }

  async getAuthHeaders() {
    throw new Error('Method not implemented');
  }
}

/**
 * Token-based authenticator
 */
class TokenAuthenticator extends BaseAuthenticator {
  constructor(config) {
    super(config);
    this.token = core.getInput('api_token', { required: true });
  }

  async getAuthHeaders() {
    return {
      'X-Vault-Auth': this.token,
      'Content-Type': 'application/json'
    };
  }
}

/**
 * Username/Password authenticator
 */
class UserPassAuthenticator extends BaseAuthenticator {
  constructor(config) {
    super(config);
    this.username = core.getInput('username', { required: true });
    this.password = core.getInput('password', { required: true });
    this.vaultUId = core.getInput('vault_uid', { required: true });
    this.token = null;
    this.tokenExpiry = null;
  }

  async getAuthHeaders() {
    if (!this.token || this.isTokenExpired()) {
      await this.authenticate();
    }
    
    return {
      'X-Vault-Auth': this.token,
      'Content-Type': 'application/json'
    };
  }

  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    // Add a 5-minute buffer to ensure we refresh before actual expiration
    return new Date(this.tokenExpiry).getTime() - 5 * 60 * 1000 < Date.now();
  }

  async authenticate() {
    try {
      core.info('Authenticating with username and password');
      
      
      const loginEndpoint = `/vault/1.0/Login/${this.vaultUId}/`;
      
      const response = await axios.post(
        this.baseUrl + loginEndpoint,
        {
          username: this.username,
          password: this.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          httpsAgent: this.httpsAgent,
          timeout: this.timeout
        }
      );
      
      if (!response.data || !response.data.access_token) {
        throw new Error('Failed to authenticate: No access token in response');
      }
      
      this.token = response.data.access_token;
      this.tokenExpiry = response.data.expires_at;
      
      core.info(`Authentication successful. Token will expire at ${this.tokenExpiry}`);
      core.setSecret(this.token); // Mark the token as a secret to prevent logging
      
    } catch (error) {
      core.error('Authentication failed');
      if (error.response) {
        core.error(`Status: ${error.response.status}`);
        core.error(`Response data: ${JSON.stringify(error.response.data || {})}`);
      }
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
}

module.exports = {
  createAuthenticator
};
