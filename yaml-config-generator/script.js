document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Deactivate all tabs
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            // Activate selected tab
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Auth type switching
    const authTypeSelect = document.getElementById('auth-type');
    authTypeSelect.addEventListener('change', function() {
        updateAuthSections(this.value);
    });

    // Initialize with default auth type (now userpass)
    updateAuthSections(authTypeSelect.value);
    
    // Base URL type switching
    const baseUrlTypeSelect = document.getElementById('base-url-type');
    baseUrlTypeSelect.addEventListener('change', function() {
        updateBaseUrlInputType(this.value);
    });
    
    // Initialize base URL input type
    updateBaseUrlInputType(baseUrlTypeSelect.value);
    
    // CA Certificate type switching
    const caCertTypeSelect = document.getElementById('ca-cert-type');
    caCertTypeSelect.addEventListener('change', function() {
        updateCaCertSection(this.value);
    });
    
    // File input handling for CA Certificate
    const caCertFileInput = document.getElementById('ca-cert-file-input');
    caCertFileInput.addEventListener('change', function(event) {
        handleCaCertFileInput(event);
    });

    // Add secret button
    const addSecretBtn = document.getElementById('add-secret');
    addSecretBtn.addEventListener('click', function() {
        addNewSecretRow();
    });

    // Initial setup for remove secret buttons
    setupRemoveSecretButtons();

    // Generate YAML button
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.addEventListener('click', function() {
        generateYaml();
    });

    // Copy YAML button
    const copyBtn = document.getElementById('copy-yaml');
    copyBtn.addEventListener('click', function() {
        copyYaml();
    });

    // Back to form button
    const backBtn = document.getElementById('back-to-form');
    backBtn.addEventListener('click', function() {
        document.getElementById('result').classList.add('hidden');
        document.querySelector('.card').classList.remove('hidden');
    });
});

// Function to update authentication sections based on selected auth type
function updateAuthSections(authType) {
    const tokenAuth = document.getElementById('token-auth');
    const userpassAuth = document.getElementById('userpass-auth');
    
    if (authType === 'token') {
        tokenAuth.classList.remove('hidden');
        userpassAuth.classList.add('hidden');
    } else {
        tokenAuth.classList.add('hidden');
        userpassAuth.classList.remove('hidden');
    }
}

// Function to update base URL input type
function updateBaseUrlInputType(urlType) {
    const secretInput = document.getElementById('base-url-secret');
    const plaintextInput = document.getElementById('base-url-plaintext');
    
    if (urlType === 'plaintext') {
        secretInput.classList.add('hidden');
        plaintextInput.classList.remove('hidden');
    } else {
        secretInput.classList.remove('hidden');
        plaintextInput.classList.add('hidden');
    }
}

// Function to update CA Certificate section based on selected type
function updateCaCertSection(certType) {
    const caCertOptions = document.querySelectorAll('.ca-cert-option');
    caCertOptions.forEach(option => option.classList.add('hidden'));
    
    if (certType !== 'none') {
        document.getElementById(`ca-cert-${certType}`).classList.remove('hidden');
    }
}

// Function to handle CA certificate file input
function handleCaCertFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const filePreview = document.getElementById('ca-cert-file-preview');
    const filenameDisplay = document.getElementById('ca-cert-filename');
    
    filenameDisplay.textContent = file.name;
    filePreview.classList.remove('hidden');
    
    // Store the file for later processing
    window.selectedCaCertFile = file;
}

// Function to read file as base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove the prefix "data:application/octet-stream;base64,"
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

// Function to add a new secret row
function addNewSecretRow() {
    const secretsContainer = document.getElementById('secrets-container');
    
    // Create a new row
    const row = document.createElement('div');
    row.className = 'secret-row';
    
    row.innerHTML = `
        <div class="form-group">
            <label>Box Name/ID:</label>
            <input type="text" class="box-name" placeholder="Box1" required>
            <div class="tooltip">
                <i class="fas fa-info-circle"></i>
                <span class="tooltip-text">Name or ID of the box containing the secret</span>
            </div>
        </div>
        <div class="form-group">
            <label>Secret Name/ID:</label>
            <input type="text" class="secret-name" placeholder="secretName" required>
            <div class="tooltip">
                <i class="fas fa-info-circle"></i>
                <span class="tooltip-text">Name or ID of the secret to retrieve</span>
            </div>
        </div>
        <div class="form-group">
            <label>Environment Variable:</label>
            <input type="text" class="env-var" placeholder="ENV_VAR_NAME" required>
            <div class="tooltip">
                <i class="fas fa-info-circle"></i>
                <span class="tooltip-text">Name of environment variable where the secret will be available</span>
            </div>
        </div>
        <button type="button" class="icon-button remove-secret" title="Remove secret">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    secretsContainer.appendChild(row);
    
    // Setup the remove button for the new row
    setupRemoveSecretButtons();
}

// Function to setup remove secret buttons
function setupRemoveSecretButtons() {
    const removeButtons = document.querySelectorAll('.remove-secret');
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Don't remove if it's the only secret row
            const secretRows = document.querySelectorAll('.secret-row');
            if (secretRows.length > 1) {
                this.closest('.secret-row').remove();
            } else {
                // Clear the inputs instead
                const inputs = this.closest('.secret-row').querySelectorAll('input');
                inputs.forEach(input => input.value = '');
            }
        });
    });
}

// Function to generate YAML
async function generateYaml() {
    try {
        // Get values from form
        const stepId = document.getElementById('step-id').value || 'fetch-secrets';
        
        // Get base URL based on selected type
        const baseUrlType = document.getElementById('base-url-type').value;
        let baseUrl = '';
        
        if (baseUrlType === 'secret') {
            baseUrl = document.getElementById('base-url-secret-input').value;
        } else {
            baseUrl = document.getElementById('base-url-plaintext-input').value;
        }
        
        const authType = document.getElementById('auth-type').value;
        const apiToken = document.getElementById('api-token').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const vaultUid = document.getElementById('vault-uid').value;
        
        // Handle CA Certificate based on selected type
        const caCertType = document.getElementById('ca-cert-type').value;
        let caCert = '';
        
        if (caCertType === 'secret') {
            caCert = document.getElementById('ca-cert-secret-input').value;
        } else if (caCertType === 'base64') {
            caCert = document.getElementById('ca-cert-base64-input').value;
        } else if (caCertType === 'file' && window.selectedCaCertFile) {
            // Convert file to base64
            try {
                caCert = await readFileAsBase64(window.selectedCaCertFile);
                // Add context that this was automatically converted
                caCert = `"${caCert}" # Auto-converted from ${window.selectedCaCertFile.name}`;
            } catch (error) {
                console.error("Error converting file to base64:", error);
                alert("Failed to convert certificate file to base64. Please try again or use the base64 input option.");
                return;
            }
        }
        
        const tlsVerifySkip = document.getElementById('tls-verify-skip').value;
        const continueOnError = document.getElementById('continue-on-error').value;
        
        // Get secrets
        const secretRows = document.querySelectorAll('.secret-row');
        const secrets = [];
        
        secretRows.forEach(row => {
            const boxName = row.querySelector('.box-name').value.trim();
            const secretName = row.querySelector('.secret-name').value.trim();
            const envVar = row.querySelector('.env-var').value.trim();
            
            if (boxName && secretName && envVar) {
                secrets.push(`${boxName}.${secretName} | ${envVar}`);
            }
        });
        
        // Validate required fields
        if (!baseUrl) {
            alert('Base URL is required');
            return;
        }
        
        if (authType === 'token' && !apiToken) {
            alert('API Token is required for token authentication');
            return;
        }
        
        if (authType === 'userpass' && (!username || !password || !vaultUid)) {
            alert('Username, Password, and Vault UID are required for userpass authentication');
            return;
        }
        
        if (secrets.length === 0) {
            alert('At least one secret is required');
            return;
        }
        
        // Build YAML
        let yaml = `- name: Fetch secrets from vault\n`;
        yaml += `  id: ${stepId}\n`;
        yaml += `  uses: EntrustCorporation/secrets-vault-action@v1\n`;
        yaml += `  with:\n`;
        yaml += `    base_url: ${baseUrl}\n`;
        
        if (authType === 'userpass') {
            yaml += `    auth_type: 'userpass'\n`;
            yaml += `    username: ${username}\n`;
            yaml += `    password: ${password}\n`;
            yaml += `    vault_uid: ${vaultUid}\n`;
        } else {
            yaml += `    api_token: ${apiToken}\n`;
        }
        
        if (caCert) {
            yaml += `    ca_cert: ${caCert}\n`;
        }
        
        if (tlsVerifySkip === 'true') {
            yaml += `    tls_verify_skip: ${tlsVerifySkip}\n`;
        }
        
        yaml += `    secrets: |\n`;
        secrets.forEach(secret => {
            yaml += `      ${secret};\n`;
        });
        
        if (continueOnError === 'true') {
            yaml += `  continue-on-error: true\n`;
        }
        
        // Display the result
        document.getElementById('yaml-output').textContent = yaml;
        document.getElementById('result').classList.remove('hidden');
        document.querySelector('.card').classList.add('hidden');
        
        // Scroll to results
        document.getElementById('result').scrollIntoView({behavior: 'smooth'});
    } catch (error) {
        console.error("Error generating YAML:", error);
        alert("An error occurred while generating the YAML. Please check your inputs and try again.");
    }
}

// Function to copy YAML
function copyYaml() {
    const yamlContent = document.getElementById('yaml-output').textContent;
    
    // Use clipboard API if available
    if (navigator.clipboard) {
        navigator.clipboard.writeText(yamlContent)
            .then(() => {
                const copyBtn = document.getElementById('copy-yaml');
                const originalText = copyBtn.innerHTML;
                
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.style.backgroundColor = '#28a745';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.backgroundColor = '';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy to clipboard. Please select and copy manually.');
            });
    } else {
        // Fallback for browsers that don't support clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = yamlContent;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
            document.execCommand('copy');
            const copyBtn = document.getElementById('copy-yaml');
            const originalText = copyBtn.innerHTML;
            
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyBtn.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.backgroundColor = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('Failed to copy to clipboard. Please select and copy manually.');
        }
        
        document.body.removeChild(textarea);
    }
}