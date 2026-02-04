# Security Compliance Guide for Corporate Deployment

This document outlines the security measures implemented and steps required for corporate approval.

## ✅ Already Implemented (Good Security Posture)

1. **Context Isolation**: Enabled in main.ts - prevents renderer process from accessing Node.js
2. **Node Integration Disabled**: Prevents direct Node.js access from web content
3. **Web Security**: Enabled to prevent cross-origin vulnerabilities
4. **Secure Preload Script**: Uses contextBridge API for controlled IPC communication
5. **External Link Handling**: Opens external URLs in default browser, not in-app
6. **Content Security**: Proper separation between main and renderer processes

## ⚠️ Required for Corporate Approval

### 1. Code Signing (CRITICAL)

**Why**: Without code signing, Windows SmartScreen will flag your app as "unrecognized" and users will see scary warnings.

**Required Steps**:

#### Option A: Standard Code Signing Certificate (~$200-400/year)
- Purchase from: DigiCert, Sectigo, SSL.com, or Comodo
- Validate your company identity (3-5 days process)
- Will build reputation over time as users download your app

#### Option B: Extended Validation (EV) Certificate (~$400-600/year) **RECOMMENDED**
- Immediate SmartScreen reputation (no warnings from day 1)
- Requires more rigorous company validation
- Comes on USB hardware token (more secure)
- Best for corporate environments

#### Implementation:
1. Obtain certificate from CA
2. Set environment variables:
   ```powershell
   $env:CSC_LINK = "path\to\certificate.pfx"
   $env:CSC_KEY_PASSWORD = "your-certificate-password"
   ```
3. Update electron package.json:
   ```json
   "win": {
     "certificateFile": "path/to/your-certificate.pfx",
     "certificatePassword": "${env.CSC_KEY_PASSWORD}",
     "signingHashAlgorithms": ["sha256"],
     "signDlls": true,
     "rfc3161TimeStampServer": "http://timestamp.digicert.com",
     "verifyUpdateCodeSignature": true
   }
   ```
4. Build: `npm run package:win`

### 2. Content Security Policy (CSP)

**Status**: Should be added to index.html

Add to your frontend/index.html:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' http://localhost:* https:;">
```

### 3. Automated Security Updates

**Current**: Not configured
**Recommendation**: Implement electron-updater for secure automatic updates

```bash
npm install electron-updater --save
```

Add to main.ts:
```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

### 4. Security Audit Documentation

Create a document for your security team that includes:
- [ ] Dependency audit report: `npm audit`
- [ ] List of all third-party packages
- [ ] Data storage locations
- [ ] Network communication endpoints
- [ ] Permission requirements

## 📋 Corporate Security Checklist

Use this checklist when submitting to your company's security team:

### Application Security
- [x] Context isolation enabled
- [x] Node integration disabled
- [x] Web security enabled
- [x] Sandboxed renderer process
- [ ] Content Security Policy implemented
- [ ] Code signed with trusted certificate
- [x] External links open in system browser
- [ ] Auto-update mechanism with signature verification

### Data Security
- [x] Local-only data storage (no cloud sync)
- [x] Data stored in user's AppData folder
- [ ] Optional: Data encryption at rest
- [x] No telemetry or tracking
- [x] No PII collection

### Build Security
- [ ] Reproducible builds
- [ ] Dependencies verified (npm audit clean)
- [ ] Source code review completed
- [ ] SBOM (Software Bill of Materials) generated

### Network Security
- [x] All API requests go through user-controlled proxy
- [x] HTTPS enforced for external requests
- [x] No unauthorized network calls
- [x] OAuth tokens stored securely

### Access Control
- [x] Single-user application (no multi-tenancy)
- [x] Runs under user privileges (no elevation required)
- [x] No system-level modifications
- [x] Sandboxed environment

## 🔍 Security Assessment Commands

Run these before submission:

```bash
# Check for vulnerabilities
npm audit --audit-level=moderate

# Generate dependency tree
npm list --all > dependencies.txt

# Check for outdated packages
npm outdated

# Verify build output
npm run package:win
```

## 📦 What to Provide to Your Security Team

1. **This Document**: Security compliance overview
2. **SECURITY.md**: Vulnerability reporting process
3. **Source Code**: Access to GitHub repository
4. **Build Artifacts**: Signed installer (.exe)
5. **Dependency List**: All npm packages used
6. **Audit Report**: `npm audit` results
7. **Certificate Details**: Code signing certificate information
8. **Architecture Diagram**: How components communicate

## 🚀 Pre-Submission Steps

1. **Update all dependencies**:
   ```bash
   npm update
   npm audit fix
   ```

2. **Generate SBOM** (Software Bill of Materials):
   ```bash
   npm install -g @cyclonedx/cyclonedx-npm
   cyclonedx-npm --output-file sbom.json
   ```

3. **Sign the application** with your code signing certificate

4. **Test on a clean Windows machine** to verify no warnings

5. **Document all network endpoints** the app communicates with

6. **Create installation guide** for IT department

## 🔒 Additional Recommendations

### For Maximum Security Approval:

1. **Add Windows Installer Signing**
   - Sign both the .exe installer AND the app itself
   - Use the same certificate for consistency

2. **Implement Crash Reporting** (optional)
   - Use Sentry or similar for diagnostics
   - Ensure no PII is sent
   - Make it opt-in

3. **Add Version Information to Executable**
   ```json
   "win": {
     "fileVersion": "0.1.0",
     "productVersion": "0.1.0",
     "companyName": "Your Company Name",
     "copyright": "Copyright © 2026 Your Company"
   }
   ```

4. **Create Privacy Policy**
   - Document what data is collected (if any)
   - Where data is stored
   - How data is protected

5. **Penetration Testing**
   - Consider hiring a security firm
   - Document findings and remediations

## 📞 Support

For security questions during your company's review process:
- Email: security@yourcompany.com
- Documentation: See /docs folder
- Source Code: GitHub repository

## Timeline for Implementation

1. **Week 1**: Obtain code signing certificate (order + validation)
2. **Week 1**: Implement CSP and security updates
3. **Week 2**: Generate security documentation
4. **Week 2**: Run security audits and fix issues
5. **Week 3**: Sign and test builds
6. **Week 3**: Submit to corporate security team
7. **Week 4+**: Address any security team questions

## Common Corporate Requirements

Be prepared to answer:
- ✅ Where is data stored? → Local AppData folder only
- ✅ Is code open source? → Yes (MIT License)
- ⚠️ Is the app signed? → **You need to implement this**
- ✅ Does it require admin rights? → No
- ✅ What network calls does it make? → Only user-initiated API requests
- ✅ Does it collect telemetry? → No
- ✅ Can it be audited? → Yes, full source available
- ⚠️ Is there an update mechanism? → **Recommended to add**

## Estimated Costs

- Code Signing Certificate: $200-600/year
- Optional: Security audit: $2,000-10,000 (one-time)
- Optional: Penetration testing: $5,000-20,000 (one-time)

**Minimum viable cost**: $200-400/year for standard code signing certificate
