# Environment Variables

Manage different environments (dev, staging, production) with environment variables.

## What are Environments?

Environments let you switch between different configurations without changing your requests:

- **Development**: `http://localhost:3000`
- **Staging**: `https://staging.api.example.com`
- **Production**: `https://api.example.com`

## Creating an Environment

1. Navigate to **Environments** tab
2. Click **New Environment**
3. Enter environment name (e.g., "Development")
4. Add variables as key-value pairs
5. Click **Save**

## Variables

Variables are defined as key-value pairs:

```
base_url = https://api.example.com
api_key = sk_test_1234567890
user_id = 12345
timeout = 5000
```

## Using Variables in Requests

Reference variables with double curly braces: <code v-pre>{{variable_name}}</code>

### In URLs

```
GET {{base_url}}/users/{{user_id}}
```

Becomes:
```
GET https://api.example.com/users/12345
```

### In Headers

```
Authorization: Bearer {{api_token}}
X-API-Key: {{api_key}}
```

### In Query Parameters

```
Key: api_key
Value: {{api_key}}
```

### In Request Body

```json
{
  "userId": "{{user_id}}",
  "baseUrl": "{{base_url}}/callback"
}
```

## Switching Environments

Use the **environment selector** in the header:

1. Click the dropdown (shows current environment)
2. Select different environment
3. All variables update automatically

No need to change individual requests!

## Environment Structure

### Development
```
base_url = http://localhost:3000
api_key = dev_key_12345
debug = true
log_level = verbose
```

### Staging
```
base_url = https://staging.api.example.com
api_key = staging_key_67890
debug = true
log_level = info
```

### Production
```
base_url = https://api.example.com
api_key = prod_key_abcde
debug = false
log_level = error
```

## Variable Autocomplete

When typing double curly braces, Requesto shows available variables:

1. Type the opening braces
2. See dropdown of variables
3. Select or continue typing
4. Press `Tab` or `Enter` to complete

## Editing Environments

1. Go to **Environments** tab
2. Click on environment to edit
3. Add, modify, or remove variables
4. Changes save automatically

## Duplicating Environments

Create a copy:

1. Right-click environment
2. Select **Duplicate**
3. Modify as needed

Useful for creating staging from production config.

## Importing & Exporting

### Export Environment

1. Right-click environment
2. Select **Export**
3. Save as JSON file

Format:
```json
{
  "name": "Development",
  "variables": {
    "base_url": "http://localhost:3000",
    "api_key": "dev_key_12345"
  },
  "isActive": false
}
```

### Import Environment

1. Click **Import** button
2. Select JSON file
3. Environment appears in list

## Security Best Practices

### Sensitive Data

**API Keys and Secrets**:
- Store in environment variables, not in requests
- Use different keys for each environment
- Never commit production keys to Git

**Sharing Environments**:
- Export without sensitive values
- Use placeholder values: `api_key = YOUR_KEY_HERE`
- Share actual keys via secure channel

### Example Safe Export

```json
{
  "name": "Development",
  "variables": {
    "base_url": "http://localhost:3000",
    "api_key": "<<REPLACE_WITH_YOUR_DEV_KEY>>",
    "secret": "<<REPLACE_WITH_YOUR_SECRET>>"
  }
}
```

## Advanced Usage

### Nested Variables

Reference variables within variables:

```
api_url = {{base_url}}/api/v1
auth_url = {{api_url}}/auth
users_url = {{api_url}}/users
```

### Conditional Values

Use different variables based on environment:

**Development**:
```
endpoint = /debug/users
```

**Production**:
```
endpoint = /users
```

Request:
```
GET {{base_url}}{{endpoint}}
```

### Default Values

Set fallback values in requests:

```
GET {{base_url:-http://localhost:3000}}/api
```

If `base_url` is not defined, uses `http://localhost:3000`.

## Common Patterns

### Multi-tenant Configuration

```
tenant_id = acme_corp
base_url = https://{{tenant_id}}.api.example.com
```

### API Versioning

```
api_version = v2
base_url = https://api.example.com/{{api_version}}
```

### Regional Endpoints

**US Environment**:
```
region = us-east-1
base_url = https://{{region}}.api.example.com
```

**EU Environment**:
```
region = eu-west-1
base_url = https://{{region}}.api.example.com
```

## Tips & Tricks

### 1. Use Descriptive Names

```
Good
user_id = 12345
api_token = eyJ0eXAiOiJKV1QiLCJ...

Bad
id = 12345
token = eyJ0eXAiOiJKV1QiLCJ...
```

### 2. Group Related Variables

```
# API Configuration
base_url = https://api.example.com
api_version = v2
api_key = sk_12345

# User Context
user_id = 12345
user_email = test@example.com

# Feature Flags
enable_cache = true
enable_logging = false
```

### 3. Document Variable Purpose

Keep a README in your project:

```markdown
## Environment Variables

- `base_url`: API base endpoint
- `api_key`: Authentication key (get from dashboard)
- `user_id`: Test user ID
- `timeout`: Request timeout in milliseconds
```

### 4. Use Naming Conventions

```
# Snake case (recommended)
base_url
api_key
user_id

# Camel case
baseUrl
apiKey
userId

# Prefix by category
api_base_url
api_key
api_version
user_id
user_email
```

### 5. Test Variable Substitution

Use the console to verify variables are replaced correctly:

1. Send request
2. Open Console panel
3. Check "Request" tab to see final URL with substituted values

## Troubleshooting

### Variable Not Replaced

**Symptom**: Variable placeholders appear in request instead of actual values

**Solutions**:
- Check variable name spelling
- Verify environment is active (selected in dropdown)
- Ensure variable is defined in active environment

### Missing Variable Warning

Requesto highlights missing variables in orange:
- Add the variable to your environment
- Or remove the variable reference from request

### Case Sensitivity

Variable names are case-sensitive:
- <code v-pre>{{api_key}}</code> ≠ <code v-pre>{{API_KEY}}</code>
- <code v-pre>{{userId}}</code> ≠ <code v-pre>{{userid}}</code>

Keep consistent naming across environments.

## Best Practices Checklist

- [ ] Create separate environment for each deployment stage
- [ ] Use consistent variable names across environments
- [ ] Store sensitive values in environment variables, not requests
- [ ] Document required variables for team members
- [ ] Export environments without secrets before sharing
- [ ] Test requests in each environment before deploying
- [ ] Use descriptive environment names
- [ ] Keep variable names short but meaningful
