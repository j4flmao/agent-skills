# Vault Transit Secrets Engine
## Implementation
Code examples for using the HashiCorp Vault transit secrets engine.
```bash
# Enable Transit secrets engine
vault secrets enable transit

# Create a key
vault write -f transit/keys/my-key

# Encrypt data
vault write transit/encrypt/my-key plaintext=$(echo "my secret data" | base64)
```
