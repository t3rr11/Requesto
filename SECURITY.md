# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly:

1. [Open a GitHub Issue](https://github.com/yourusername/Requesto/issues/new) with the "Security" label
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Time

- We will acknowledge receipt within 48 hours
- We will provide a detailed response within 7 days
- We will work on a fix and keep you updated on progress

### Disclosure Policy

- Please allow us reasonable time to address the issue before public disclosure
- We will credit reporters (unless they prefer to remain anonymous)
- We will publish security advisories for confirmed vulnerabilities

## Security Best Practices

### For Users

1. **Keep Updated**: Always use the latest version
2. **Secure Data**: Store sensitive API keys in environment variables
3. **Network Security**: Use HTTPS for API requests
4. **Access Control**: Restrict access to your Requesto instance

### For Developers

1. **Dependencies**: Regularly update dependencies
2. **Code Review**: Review all pull requests for security issues
3. **Input Validation**: Validate all user inputs
4. **Secrets**: Never commit API keys, tokens, or credentials

## Known Security Considerations

### Data Storage

- All data is stored locally in JSON files
- Sensitive data is not encrypted at rest (use OS-level encryption)
- OAuth tokens are stored in plain text (secure your filesystem)

### Network

- Backend proxy makes requests on your behalf
- All requests are logged in history
- No data is sent to external servers

### Electron

- Context isolation is enabled
- Node integration is disabled in renderer
- Web security is enforced

## Vulnerability Disclosure

We will disclose security issues through:
- GitHub Security Advisories
- Release notes
- Documentation updates


