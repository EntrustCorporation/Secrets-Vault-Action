# Secret-Vault-Action Integration Tests

This directory contains integration tests for the Secret-Vault-Action GitHub Action.

## Overview

The integration tests verify that:
1. Token-based authentication works correctly
2. Username/Password authentication works correctly
3. Secrets can be fetched from the vault using both authentication methods

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Tests are configured using environment variables, which can be set using a `.env` file:

1. Copy the example env file:
   ```bash
   cp integration_tests/.env.integration.example integration_tests/.env.integration
   ```

2. Edit the `.env.integration` file with your credentials

Alternatively, you can set environment variables directly:

```bash
export TEST_BASE_URL="https://your-vault-api.example.com"
export TEST_AUTH_TYPE="token"  # or "userpass"
export TEST_API_TOKEN="your-api-token"  # for token auth
# For userpass auth
export TEST_USERNAME="your-username"
export TEST_PASSWORD="your-password"
export TEST_VAULT_UID="your-vault-uid"
# Common
export TEST_BOX_ID="your-box-id"
export TEST_SECRET_ID="your-secret-id"
export TEST_CA_CERT="base64-encoded-ca-cert-if-needed"
```

## Running the Tests

Integration tests are run using Jest:

```bash
# Run all integration tests with default auth type (token)
npm run test:integration

# Run integration tests with token auth
npm run test:integration:token

# Run integration tests with userpass auth
npm run test:integration:userpass

# Run with a specific env file
ENV_FILE=.env.custom npm run test:integration
```

## Notes

- These tests are designed to be run independently from unit tests
- Tests use Jest's standard testing framework
- Tests will validate proper authentication and secret retrieval without exposing sensitive values
- All temporary files (like CA certificates) are automatically cleaned up
