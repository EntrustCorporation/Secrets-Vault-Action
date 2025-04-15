

// These constants are used to define the input parameters for the GitHub Action
const BASE_URL = 'base_url';
const AUTH_TYPE = 'auth_type';
const USERNAME = 'username';
const PASSWORD = 'password';
const API_TOKEN = 'api_token';
const VAULT_UID = 'vault_uid';
const CA_CERT = 'ca_cert';
const TLS_VERIFY_SKIP = 'tls_verify_skip';
const SECRETS = 'secrets';

const TOKEN_AUTH = 'token';
const USERPASS_AUTH = 'userpass';

const VAULT_AUTH_HEADER = 'X-Vault-Auth';


module.exports = {
  BASE_URL,
  AUTH_TYPE,
  USERNAME,
  PASSWORD,
  API_TOKEN,
  VAULT_UID,
  CA_CERT,
  TLS_VERIFY_SKIP,
  SECRETS,

  TOKEN_AUTH,
  USERPASS_AUTH,

  VAULT_AUTH_HEADER
};