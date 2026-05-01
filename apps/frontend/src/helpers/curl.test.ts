import { describe, it, expect } from 'vitest';
import { parseCurlCommand } from './curl';

describe('parseCurlCommand', () => {
  it('returns null for non-curl input', () => {
    expect(parseCurlCommand('http://example.com')).toBeNull();
    expect(parseCurlCommand('  ')).toBeNull();
    expect(parseCurlCommand('wget http://example.com')).toBeNull();
  });

  it('returns null if no URL found', () => {
    expect(parseCurlCommand('curl -H "Accept: */*"')).toBeNull();
  });

  it('parses a simple GET request', () => {
    const result = parseCurlCommand("curl 'http://localhost:5173/api/collections'");
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.url).toBe('http://localhost:5173/api/collections');
  });

  it('parses multiline curl with headers (the user example)', () => {
    const curlText = `curl 'http://localhost:5173/api/collections' \\
  -H 'Accept: */*' \\
  -H 'Accept-Language: en-GB,en;q=0.9' \\
  -H 'Cache-Control: no-cache' \\
  -H 'Connection: keep-alive' \\
  -b 'token=eyJhbGci...' \\
  -H 'Pragma: no-cache' \\
  -H 'Referer: http://localhost:5173/' \\
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0)'`;

    const result = parseCurlCommand(curlText);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.url).toBe('http://localhost:5173/api/collections');

    const headerKeys = result!.headers.map(h => h.key);
    expect(headerKeys).toContain('Accept');
    expect(headerKeys).toContain('Cache-Control');
    expect(headerKeys).toContain('Cookie');
    expect(headerKeys).not.toContain(''); // no duplicate empty key from -b

    const cookieHeader = result!.headers.find(h => h.key === 'Cookie');
    expect(cookieHeader?.value).toBe('token=eyJhbGci...');

    const userAgentHeader = result!.headers.find(h => h.key === 'User-Agent');
    expect(userAgentHeader?.value).toBe('Mozilla/5.0 (Windows NT 10.0)');
  });

  it('parses explicit POST method with JSON body', () => {
    const result = parseCurlCommand(`curl -X POST http://example.com/api -H 'Content-Type: application/json' -d '{"key":"value"}'`);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('POST');
    expect(result!.url).toBe('http://example.com/api');
    expect(result!.body).toBe('{"key":"value"}');
    expect(result!.bodyType).toBe('json');
  });

  it('infers POST when -d flag is present with no explicit method', () => {
    const result = parseCurlCommand(`curl http://example.com/api -d '{"key":"value"}'`);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('POST');
    expect(result!.body).toBe('{"key":"value"}');
  });

  it('handles --data-raw', () => {
    const result = parseCurlCommand(`curl http://example.com --data-raw 'raw body'`);
    expect(result!.method).toBe('POST');
    expect(result!.body).toBe('raw body');
    expect(result!.bodyType).toBe('json');
  });

  it('handles --data-binary', () => {
    const result = parseCurlCommand(`curl http://example.com --data-binary @file`);
    expect(result!.method).toBe('POST');
    expect(result!.body).toBe('@file');
  });

  it('parses basic auth via -u flag', () => {
    const result = parseCurlCommand("curl -u admin:secret123 http://example.com");
    expect(result).not.toBeNull();
    expect(result!.auth.type).toBe('basic');
    expect(result!.auth.basic?.username).toBe('admin');
    expect(result!.auth.basic?.password).toBe('secret123');
  });

  it('parses basic auth with no password', () => {
    const result = parseCurlCommand("curl -u admin: http://example.com");
    expect(result!.auth.type).toBe('basic');
    expect(result!.auth.basic?.username).toBe('admin');
    expect(result!.auth.basic?.password).toBe('');
  });

  it('promotes Authorization: Bearer header to auth config', () => {
    const result = parseCurlCommand(`curl http://example.com -H 'Authorization: Bearer mytoken123'`);
    expect(result).not.toBeNull();
    expect(result!.auth.type).toBe('bearer');
    expect(result!.auth.bearer?.token).toBe('mytoken123');
    // Should not appear in raw headers
    const hasAuthHeader = result!.headers.some(h => h.key.toLowerCase() === 'authorization');
    expect(hasAuthHeader).toBe(false);
  });

  it('promotes Authorization: Basic header to auth config', () => {
    const encoded = btoa('user:pass');
    const result = parseCurlCommand(`curl http://example.com -H 'Authorization: Basic ${encoded}'`);
    expect(result).not.toBeNull();
    expect(result!.auth.type).toBe('basic');
    expect(result!.auth.basic?.username).toBe('user');
    expect(result!.auth.basic?.password).toBe('pass');
    const hasAuthHeader = result!.headers.some(h => h.key.toLowerCase() === 'authorization');
    expect(hasAuthHeader).toBe(false);
  });

  it('leaves unrecognized Authorization header as raw header', () => {
    const result = parseCurlCommand(`curl http://example.com -H 'Authorization: Digest realm="test"'`);
    expect(result).not.toBeNull();
    expect(result!.auth.type).toBe('none');
    const hasAuthHeader = result!.headers.some(h => h.key.toLowerCase() === 'authorization');
    expect(hasAuthHeader).toBe(true);
  });

  it('parses form data (-F)', () => {
    const result = parseCurlCommand(`curl -X POST http://example.com/upload -F 'file=@photo.jpg' -F 'name=Alice'`);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('POST');
    expect(result!.bodyType).toBe('form-data');
    expect(result!.formDataEntries.find(e => e.key === 'name')?.value).toBe('Alice');
    expect(result!.formDataEntries.find(e => e.key === 'file')?.value).toBe('@photo.jpg');
  });

  it('parses url-encoded form (--data-urlencode)', () => {
    const result = parseCurlCommand(`curl http://example.com --data-urlencode 'username=admin' --data-urlencode 'password=secret'`);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('POST');
    expect(result!.bodyType).toBe('x-www-form-urlencoded');
    expect(result!.formDataEntries.find(e => e.key === 'username')?.value).toBe('admin');
    expect(result!.formDataEntries.find(e => e.key === 'password')?.value).toBe('secret');
  });

  it('extracts query params from URL into params array', () => {
    const result = parseCurlCommand(`curl 'http://example.com/search?q=hello&page=2'`);
    expect(result).not.toBeNull();
    expect(result!.url).toBe('http://example.com/search');
    const q = result!.params.find(p => p.key === 'q');
    const page = result!.params.find(p => p.key === 'page');
    expect(q?.value).toBe('hello');
    expect(page?.value).toBe('2');
  });

  it('handles --request (long form of -X)', () => {
    const result = parseCurlCommand(`curl --request DELETE http://example.com/resource/1`);
    expect(result!.method).toBe('DELETE');
  });

  it('handles -G to force GET even with data', () => {
    const result = parseCurlCommand(`curl -G http://example.com -d 'filter=active'`);
    expect(result!.method).toBe('GET');
  });

  it('handles --json flag', () => {
    const result = parseCurlCommand(`curl http://example.com --json '{"a":1}'`);
    expect(result!.body).toBe('{"a":1}');
    expect(result!.bodyType).toBe('json');
    const ct = result!.headers.find(h => h.key === 'Content-Type');
    expect(ct?.value).toBe('application/json');
  });

  it('handles -b cookie flag', () => {
    const result = parseCurlCommand(`curl http://example.com -b 'session=abc; user=test'`);
    const cookie = result!.headers.find(h => h.key === 'Cookie');
    expect(cookie?.value).toBe('session=abc; user=test');
  });

  it('ignores -L -k -s --compressed flags', () => {
    const result = parseCurlCommand(`curl -L -k -s --compressed http://example.com`);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.url).toBe('http://example.com');
  });

  it('handles double-quoted URL', () => {
    const result = parseCurlCommand(`curl "http://example.com/path?a=1"`);
    expect(result!.url).toBe('http://example.com/path');
    expect(result!.params.find(p => p.key === 'a')?.value).toBe('1');
  });

  it('handles unquoted URL', () => {
    const result = parseCurlCommand(`curl http://example.com`);
    expect(result!.url).toBe('http://example.com');
  });

  it('all returned header rows have enabled=true', () => {
    const result = parseCurlCommand(`curl http://example.com -H 'X-Custom: value'`);
    for (const header of result!.headers) {
      if (header.key) expect(header.enabled).toBe(true);
    }
  });

  it('all returned param rows have enabled=true', () => {
    const result = parseCurlCommand(`curl http://example.com?foo=bar`);
    for (const param of result!.params) {
      if (param.key) expect(param.enabled).toBe(true);
    }
  });
});

describe('parseCurlCommand – cmd format', () => {
  it('parses cmd curl with ^" quoted arguments', () => {
    const result = parseCurlCommand(`curl ^"http://localhost:5173/api/collections^" -H ^"Accept: */*^" -H ^"Cache-Control: no-cache^"`);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.url).toBe('http://localhost:5173/api/collections');
    expect(result!.headers.find(h => h.key === 'Accept')?.value).toBe('*/*');
    expect(result!.headers.find(h => h.key === 'Cache-Control')?.value).toBe('no-cache');
  });

  it('handles ^ line continuations (cmd style)', () => {
    const curlText = `curl ^"http://localhost:5173/api/collections^" ^\r\n  -H ^"Accept: */*^" ^\r\n  -H ^"Cache-Control: no-cache^"`;
    const result = parseCurlCommand(curlText);
    expect(result).not.toBeNull();
    expect(result!.url).toBe('http://localhost:5173/api/collections');
    expect(result!.headers.find(h => h.key === 'Accept')?.value).toBe('*/*');
  });

  it('parses cmd curl with -b cookie', () => {
    const result = parseCurlCommand(`curl ^"http://example.com^" -b ^"token=abc123^"`);
    expect(result!.headers.find(h => h.key === 'Cookie')?.value).toBe('token=abc123');
  });

  it('parses cmd curl POST with JSON body', () => {
    // cmd encodes embedded " as ^\^" (^\ → \ then ^" → ", giving \" for curl to process)
    const result = parseCurlCommand(`curl -X POST ^"http://example.com/api^" -H ^"Content-Type: application/json^" -d ^"{^\\^"key^\\^":^\\^"value^\\^"}^"`);
    expect(result!.method).toBe('POST');
    expect(result!.body).toBe('{"key":"value"}');
  });

  it('handles ^\\" embedded quotes (sec-ch-ua style) in cmd format', () => {
    // ^\^" in cmd = ^\ (literal \) + ^" (literal ") = \" which curl treats as embedded "
    const curlText = `curl ^"http://example.com^" ^\n  -H ^"sec-ch-ua: ^\\^"Chromium^\\^";v=^\\^"148^\\^"^"`;
    const result = parseCurlCommand(curlText);
    expect(result).not.toBeNull();
    const ua = result!.headers.find(h => h.key === 'sec-ch-ua');
    expect(ua?.value).toBe('"Chromium";v="148"');
  });

  it('parses the full Edge DevTools cmd export', () => {
    const curlText = [
      `curl ^"http://localhost:5173/api/collections^" ^`,
      `  -H ^"Accept: */*^" ^`,
      `  -H ^"Cache-Control: no-cache^" ^`,
      `  -H ^"Connection: keep-alive^" ^`,
      `  -b ^"token=eyJhbGci...^" ^`,
      `  -H ^"User-Agent: Mozilla/5.0 (Windows NT 10.0)^" ^`,
      `  -H ^"sec-ch-ua: ^\\^"Chromium^\\^";v=^\\^"148^\\^", ^\\^"Microsoft Edge^\\^";v=^\\^"148^\\^"^"`,
    ].join('\n');

    const result = parseCurlCommand(curlText);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.url).toBe('http://localhost:5173/api/collections');
    expect(result!.headers.find(h => h.key === 'Accept')?.value).toBe('*/*');
    expect(result!.headers.find(h => h.key === 'Cache-Control')?.value).toBe('no-cache');
    expect(result!.headers.find(h => h.key === 'Cookie')?.value).toBe('token=eyJhbGci...');
    expect(result!.headers.find(h => h.key === 'User-Agent')?.value).toBe('Mozilla/5.0 (Windows NT 10.0)');
    expect(result!.headers.find(h => h.key === 'sec-ch-ua')?.value).toBe('"Chromium";v="148", "Microsoft Edge";v="148"');
  });

  it('handles ^ continuation with trailing space before newline', () => {
    const curlText = `curl ^"http://example.com^" ^  \r\n  -H ^"Accept: */*^"`;
    const result = parseCurlCommand(curlText);
    expect(result).not.toBeNull();
    expect(result!.headers.find(h => h.key === 'Accept')?.value).toBe('*/*');
  });
});

describe('parseCurlCommand – PowerShell Invoke-WebRequest format', () => {
  it('parses a basic Invoke-WebRequest GET', () => {
    const ps = `Invoke-WebRequest -Uri 'http://localhost:5173/api/collections' -Method 'GET'`;
    const result = parseCurlCommand(ps);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.url).toBe('http://localhost:5173/api/collections');
  });

  it('parses the full Edge DevTools PowerShell export', () => {
    const ps = `$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
$session.Cookies.Add((New-Object System.Net.Cookie("token", "eyJhbGci...", "/", "localhost")))
Invoke-WebRequest -Uri "http://localhost:5173/api/collections" \`
-Method "GET" \`
-Headers @{
"Accept"="*/*"
"Accept-Language"="en-GB,en;q=0.9"
"Cache-Control"="no-cache"
"Pragma"="no-cache"
} \`
-WebSession $session`;

    const result = parseCurlCommand(ps);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.url).toBe('http://localhost:5173/api/collections');

    const headerKeys = result!.headers.map(h => h.key);
    expect(headerKeys).toContain('Accept');
    expect(headerKeys).toContain('Cache-Control');
    expect(headerKeys).toContain('Cookie');
    expect(headerKeys).toContain('User-Agent');

    expect(result!.headers.find(h => h.key === 'Cookie')?.value).toBe('token=eyJhbGci...');
    expect(result!.headers.find(h => h.key === 'Accept')?.value).toBe('*/*');
  });

  it('parses Invoke-WebRequest with -Body', () => {
    const ps = `Invoke-WebRequest -Uri "http://example.com/api" -Method "POST" -Body '{"key":"value"}' -ContentType "application/json"`;
    const result = parseCurlCommand(ps);
    expect(result).not.toBeNull();
    expect(result!.method).toBe('POST');
    expect(result!.body).toBe('{"key":"value"}');
    expect(result!.headers.find(h => h.key === 'Content-Type')?.value).toBe('application/json');
  });

  it('parses multiple cookies from $session.Cookies.Add', () => {
    const ps = `$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.Cookies.Add((New-Object System.Net.Cookie("token", "abc", "/", "example.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("user", "test", "/", "example.com")))
Invoke-WebRequest -Uri "http://example.com" -WebSession $session`;

    const result = parseCurlCommand(ps);
    expect(result).not.toBeNull();
    const cookie = result!.headers.find(h => h.key === 'Cookie');
    expect(cookie?.value).toBe('token=abc; user=test');
  });

  it('recognises iwr shorthand', () => {
    const result = parseCurlCommand(`iwr -Uri 'http://example.com' -Method 'GET'`);
    expect(result).not.toBeNull();
    expect(result!.url).toBe('http://example.com');
  });

  it('promotes Authorization Bearer header from PS headers block', () => {
    const ps = `Invoke-WebRequest -Uri "http://example.com" -Headers @{\n"Authorization"="Bearer mytoken"\n}`;
    const result = parseCurlCommand(ps);
    expect(result).not.toBeNull();
    expect(result!.auth.type).toBe('bearer');
    expect(result!.auth.bearer?.token).toBe('mytoken');
    expect(result!.headers.some(h => h.key.toLowerCase() === 'authorization')).toBe(false);
  });
});
