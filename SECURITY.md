# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly:

1. [Open a GitHub Issue](https://github.com/t3rr11/Requesto/issues/new) with the "Security" label
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

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

- All data is stored locally in JSON files, organized by workspace
- Sensitive data is not encrypted at rest (use OS-level encryption)
- OAuth client secrets are stored separately from workspace data in a local-only directory
- OAuth access tokens are stored client-side and never persisted server-side

### Network

- Local first approach
- Backend executes API requests on your behalf
- Requests history can be found in the session console
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
