const core = require('@actions/core');
const axios = require('axios');

const { AUTH_TYPE, TOKEN_AUTH, USERPASS_AUTH, VAULT_AUTH_HEADER, USERNAME, PASSWORD, VAULT_UID, API_TOKEN } = require('./constants.js');

/**
 * Factory function to create the appropriate authenticator
 * @param {Object} config Configuration object with auth details
 * @return {Object} Authenticator instance
 */
function createAuthenticator(config) {
  const authType = core.getInput(AUTH_TYPE).trim() || TOKEN_AUTH;

  switch (authType.toLowerCase()) {
    case TOKEN_AUTH:
      return new TokenAuthenticator(config);
    case USERPASS_AUTH:
      return new UserPassAuthenticator(config);
    default:
      throw new Error(`Unsupported authentication type: ${authType}, should be either ${TOKEN_AUTH} or ${USERPASS_AUTH}`);
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
    this.token = core.getInput(API_TOKEN, { required: true }).trim();
    if  ( this.token === '') {
      throw new Error('API token is required for Token authentication');
    }
  }

  async getAuthHeaders() {
    return {
      [VAULT_AUTH_HEADER]: this.token,
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
    this.username = core.getInput(USERNAME, { required: true }).trim();
    this.password = core.getInput(PASSWORD, { required: true }).trim();
    this.vaultUId = core.getInput(VAULT_UID, { required: true }).trim();

    if (!this.username || !this.password || !this.vaultUId) {
      throw new Error('Username, password, and vault UID are required for UserPass authentication');
    }

    this.token = null;
    this.tokenExpiry = null;
  }

  async getAuthHeaders() {
    if (!this.token || this.isTokenExpired()) {
      await this.authenticate();
    }
    
    return {
      [VAULT_AUTH_HEADER]: this.token,
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
