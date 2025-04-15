## Overview
The Secret Vault Action enables GitHub workflows to securely fetch secrets from an Entrust KeyControl Secret Vault and make them available during workflow execution. This document provides a comprehensive guide to using the action, including authentication methods, secret output formats, security considerations, and usage examples.

## Authentication Methods

### Token Authentication
- **Description**: Uses a pre-generated API token for direct authentication.
- **Advantages**: Simplest authentication method but requires token management.
- **Requirements**: Token must be stored as a GitHub secret.
- **Example Input**:
  ```yaml
  auth_type: 'token'
  token: ${{ secrets.VAULT_TOKEN }}
  ```

### Username/Password Authentication
- **Description**: Exchanges credentials for a temporary access token.
- **Advantages**: More secure than persistent tokens as authentication is performed for each run.
- **Requirements**: Credentials must be stored as GitHub secrets.
- **Example Input**:
  ```yaml
  auth_type: 'userpass'
  username: ${{ secrets.VAULT_USERNAME }}
  password: ${{ secrets.VAULT_PASSWORD }}
  ```

### Common Authentication Parameters
- **base_url**: Vault API endpoint.
- **vault_uid**: Unique identifier for the vault.
- **ca_cert**: Optional custom CA certificate for secure communication (base64-encoded).

## Usage

### Input Parameters

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `base_url` | Base URL of your vault service | Yes | |
| `auth_type` | Authentication type (e.g., 'userpass') | Yes | token |
| `username` | Username for authentication | Yes, if the `auth_type` is `userpass` | |
| `password` | Password for authentication | Yes, if the `auth_type` is `userpass` | |
| `api_token` | Vault Auth Token | if `auth_type` is `token` | |
| `vault_uid` | Unique identifier for the vault | Yes, if the `auth_type` is `userpass` | |
| `ca_cert` | Base64-encoded CA certificate for self-signed certificates | No | |
| `secrets` | Multi-line list of secrets to retrieve (see format below) | Yes | |

## Action Workflow

### Authentication
- Action authenticates with the vault using specified credentials.
- Obtains access token if using username/password method.
- Uses the token for subsequent API calls.
- Validates the CA certificate if provided.

### Secret Retrieval and Output
- Makes authenticated API calls to retrieve each requested secret.
- Sets values as workflow environment variables.
- Makes values available as action outputs (referenced via `steps.[step-id].outputs.[output-name]`).

### Security Controls
- All secret values marked as sensitive (masked in logs).
- Temporary tokens handled securely.
- Certificate validation for secure API communication.

## Secret Output Format

- **Format**: `BoxName.SecretName | ENV_VAR_NAME` (Alternatively, you can use BoxID and SecretID in place of BoxName and SecretName, if required)
- **Description**: Makes secrets available as environment variables to subsequent workflow steps.
- **Advantages**: Values are automatically masked in logs.
- **Example**:
  ```yaml
  Box1.apiKey | API_KEY
  ```

## Examples

### Simple Example
```yaml
- name: Fetch secrets from vault
  id: fetch-secrets
  uses: EntrustCorporation/secrets-vault-action@main
  with:
    base_url: ${{ secrets.VAULT_URL }}
    auth_type: 'userpass'
    username: ${{ secrets.VAULT_USERNAME }}
    password: ${{ secrets.VAULT_PASSWORD }}
    vault_uid: ${{ secrets.VAULT_UID }}
    ca_cert: ${{ secrets.CA_CERT }}
    secrets: |
      Box1.apiKey | API_KEY;
      Box2.databasePassword | DB_PASSWORD;
```

### Comprehensive Usage Example
```yaml
name: Deploy Application

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch secrets from vault
        id: fetch-secrets
        uses: EntrustCorporation/secrets-vault-action@main
        with:
          base_url: ${{ secrets.VAULT_URL }}
          auth_type: 'userpass'
          username: ${{ secrets.VAULT_USERNAME }}
          password: ${{ secrets.VAULT_PASSWORD }}
          vault_uid: ${{ secrets.VAULT_UID }}
          secrets: |
            Box1.accessKey | AWS_ACCESS_KEY_ID;
            Box1.secretKey | AWS_SECRET_ACCESS_KEY;
            Box2.privateKey | SSH_KEY;
            Box1.sslCert | SSL_CERT;

      - name: Create SSH directory and key
        run: |
          mkdir -p -m 700 ./ssh
          echo "$SSH_KEY" > ./ssh/id_rsa
          chmod 600 ./ssh/id_rsa

      - name: Create SSL directory and certificate
        run: |
          mkdir -p -m 700 ./ssl
          echo "$SSL_CERT" > ./ssl/certificate.pem
          chmod 644 ./ssl/certificate.pem

      - name: Configure AWS CLI
        run: |
          aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
          aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY

      - name: Run API tests
        run: |
          ./run-api-tests.sh --token=${{ steps.fetch-secrets.outputs.API_TOKEN }}

      - name: Use SSH key
        run: |
          ssh -i ./ssh/id_rsa user@example.com "echo 'Connection successful'"

      - name: Deploy to production
        run: |
          ./deploy.sh --environment=production --cert=./ssl/certificate.pem

      - name: Clean up SSH and SSL files
        if: always()
        run: |
          shred -u ./ssh/id_rsa || rm -f ./ssh/id_rsa
          rm -f ./ssl/certificate.pem
          rmdir ./ssh ./ssl
```
```

## Access Patterns for Secrets

### Direct Environment Variables
- Available in all subsequent steps.
- Used like: `$AWS_ACCESS_KEY_ID` in shell commands.

### Action Outputs
- Referenced via: `${{ steps.fetch-secrets.outputs.SECRET_NAME }}`.
- Useful in expressions or when exact variable name is important.

### File Creation Using Outputs
- Users can create files from the action's outputs if needed.
- Example:
  ```yaml
  - name: Fetch secrets from vault
    id: fetch-secrets
    uses: EntrustCorporation/secrets-vault-action@main
    with:
      base_url: ${{ secrets.VAULT_URL }}
      auth_type: 'userpass'
      username: ${{ secrets.VAULT_USERNAME }}
      password: ${{ secrets.VAULT_PASSWORD }}
      vault_uid: ${{ secrets.VAULT_UID }}
      secrets: |
        secret.Box1.accessKey | AWS_ACCESS_KEY_ID
        secret.Box1.simpleKV | SIMPLE_KV_SECRET

  - name: Create secrets file
    run: |
      touch secrets.json
      echo '${{ toJson(steps.fetch-secrets.outputs) }}' >> secrets.json
  ```

### Cleanup
- Always clean up temporary files created during the workflow.
- Example:
  ```yaml
  - name: Clean up
    if: always()
    run: |
      shred -u secrets.json || rm -f secrets.json
  ```

### Note:
Secrets of type `file` are base64-encoded. To utilize these secrets, decode them using the `base64` command available on Linux or macOS. For example:

```bash
mkdir -p -m 700 ./temp_dir
echo "$SECRET" | base64 --decode > ./temp_dir/secret_file
```

### Best Practices for Handling Secrets

When working with secrets in your workflows, follow these best practices to ensure security and minimize risks:

- **Restrict File Permissions**: If you write secrets into files, set strict permissions to prevent unauthorized access. For example:
  ```bash
  chmod 600 ./temp_dir/secret_file
  ```

- **Avoid Unnecessary File Creation**: Only create files from secrets if absolutely necessary. Use environment variables or action outputs whenever possible.

- **Secure Cleanup**: Always delete sensitive files after use to mitigate security risks. Use secure deletion methods like `shred` when available. Example:
  ```yaml
  - name: Clean up decoded secret file
    if: always()
    run: |
      shred -u ./temp_dir/secret_file || rm -f ./temp_dir/secret_file
  ```

- **Mask Sensitive Data**: Ensure that secrets are masked in logs and not exposed during workflow execution.

## Additional Resources

-  [GitHub documentation on using secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).

- [GitHub Actions Features](https://github.com/features/actions)