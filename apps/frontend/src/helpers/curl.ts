import { extractParamsFromUrl } from './url';
import type { RequestFormData } from '../forms/schemas/requestFormSchema';
import type { AuthConfig, FormDataEntry } from '../store/request/types';

type HeaderRow = RequestFormData['headers'][number];
type ParamRow = RequestFormData['params'][number];

export type ParsedCurl = Pick<
  RequestFormData,
  'method' | 'url' | 'headers' | 'params' | 'body' | 'bodyType' | 'formDataEntries' | 'auth'
>;

/** Generate a unique-ish id for form rows */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function parseHeaderString(raw: string): [string, string] | null {
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return null;
  return [raw.slice(0, colonIdx).trim(), raw.slice(colonIdx + 1).trim()];
}

function buildResult(
  method: string,
  rawUrl: string,
  rawHeaders: Array<[string, string]>,
  body: string | null,
  bodyType: RequestFormData['bodyType'],
  formEntries: Array<{ key: string; value: string }>,
  basicUser: string | null,
  basicPass: string | null,
  isDigest = false,
): ParsedCurl | null {
  if (!rawUrl) return null;

  // Deduplicate headers by lower-case key (last value wins), preserve original casing
  const headerMap = new Map<string, { key: string; value: string }>();
  for (const [k, v] of rawHeaders) {
    headerMap.set(k.toLowerCase(), { key: k, value: v });
  }

  // Auth detection - explicit -u takes priority
  let auth: AuthConfig = { type: 'none' };
  if (basicUser !== null) {
    auth = isDigest
      ? { type: 'digest', digest: { username: basicUser, password: basicPass ?? '' } }
      : { type: 'basic', basic: { username: basicUser, password: basicPass ?? '' } };
  } else if (headerMap.has('authorization')) {
    const authValue = headerMap.get('authorization')!.value;
    if (/^bearer\s+/i.test(authValue)) {
      auth = { type: 'bearer', bearer: { token: authValue.replace(/^bearer\s+/i, '').trim() } };
      headerMap.delete('authorization');
    } else if (/^basic\s+/i.test(authValue)) {
      const encoded = authValue.replace(/^basic\s+/i, '').trim();
      try {
        const decoded = atob(encoded);
        const colonIdx = decoded.indexOf(':');
        if (colonIdx !== -1) {
          auth = {
            type: 'basic',
            basic: { username: decoded.slice(0, colonIdx), password: decoded.slice(colonIdx + 1) },
          };
          headerMap.delete('authorization');
        }
      } catch {
        // leave as raw header
      }
    }
  }

  const headers: HeaderRow[] = [];
  for (const { key, value } of headerMap.values()) {
    headers.push({ id: uid(), key, value, enabled: true });
  }
  if (headers.length === 0) headers.push({ id: uid(), key: '', value: '', enabled: true });

  const formDataEntries: FormDataEntry[] =
    formEntries.length > 0
      ? formEntries.map(e => ({ id: uid(), key: e.key, value: e.value, type: 'text' as const, enabled: true }))
      : [{ id: uid(), key: '', value: '', type: 'text' as const, enabled: true }];

  const { baseUrl, params: extractedParams } = extractParamsFromUrl(rawUrl);
  const params: ParamRow[] = extractedParams.map(p => ({ id: uid(), key: p.key, value: p.value, enabled: true }));
  if (params.length === 0) params.push({ id: uid(), key: '', value: '', enabled: true });

  return { method, url: baseUrl, headers, params, body: body ?? '', bodyType, formDataEntries, auth };
}

// ─── curl parser ───────────────────────────────────────────────────────────────

/**
 * Tokenize a curl command string, handling bash (single/double quotes, `\` continuations)
 * and cmd (double quotes, `^` continuations).
 */
function tokenize(input: string): string[] {
  let normalized: string;

  // cmd format is detected by ^" - strip line continuations then unescape all ^X sequences
  // (e.g. ^"text^" -> "text"), producing standard double-quoted syntax the tokenizer handles.
  if (/\^"/.test(input)) {
    normalized = input
      .replace(/\^[ \t]*\r?\n[ \t]*/g, ' ')   // ^<newline> continuations
      .replace(/\^([^\r\n])/g, '$1');            // ^X -> X  (^" -> ", ^\ -> \, etc.)
  } else {
    normalized = input.replace(/\\[ \t]*\r?\n[ \t]*/g, ' '); // bash \<newline> continuations
  }

  const tokens: string[] = [];
  let i = 0;
  const len = normalized.length;

  while (i < len) {
    if (/\s/.test(normalized[i])) { i++; continue; }

    if (normalized[i] === "'") {
      // Single-quoted: literal, no escapes
      i++;
      let token = '';
      while (i < len && normalized[i] !== "'") token += normalized[i++];
      i++;
      tokens.push(token);
    } else if (normalized[i] === '"') {
      // Double-quoted: backslash escapes
      i++;
      let token = '';
      while (i < len && normalized[i] !== '"') {
        if (normalized[i] === '\\' && i + 1 < len) {
          i++;
          const esc = normalized[i++];
          switch (esc) {
            case 'n': token += '\n'; break;
            case 't': token += '\t'; break;
            case 'r': token += '\r'; break;
            default: token += esc; break;
          }
        } else {
          token += normalized[i++];
        }
      }
      i++;
      tokens.push(token);
    } else {
      let token = '';
      while (i < len && !/\s/.test(normalized[i])) token += normalized[i++];
      tokens.push(token);
    }
  }

  return tokens;
}

// Flags that consume the next token as their value
const FLAGS_WITH_VALUE = new Set([
  '-X', '--request',
  '-H', '--header',
  '-d', '--data', '--data-raw', '--data-binary', '--data-ascii', '--data-urlencode',
  '-F', '--form',
  '-b', '--cookie',
  '-u', '--user',
  '-o', '--output',
  '-e', '--referer',
  '-A', '--user-agent',
  '--url',
  '--json',
  '-T', '--upload-file',
  '--connect-timeout', '--max-time', '-m',
  '--proxy', '-x',
  '--cert', '--key', '--cacert',
  '--resolve',
  '--unix-socket',
]);

// Boolean/standalone flags (no value argument)
const FLAGS_IGNORE = new Set([
  '-L', '--location',
  '-k', '--insecure',
  '-s', '--silent',
  '-S', '--show-error',
  '-v', '--verbose',
  '--compressed',
  '-i', '--include',
  '-I', '--head',
  '-g', '--globoff',
  '--http1.0', '--http1.1', '--http2', '--http2-prior-knowledge',
  '-n', '--netrc',
  '--netrc-optional',
  '-N', '--no-buffer',
  '--no-keepalive',
  '--fail',
  '-f',
  '--tr-encoding',
  '--tcp-nodelay',
  '--path-as-is',
  '--digest',
  '--ntlm',
  '--anyauth',
  '--negotiate',
  '--delegation',
]);

function parseCurlBash(trimmed: string): ParsedCurl | null {
  const tokens = tokenize(trimmed);
  if (!tokens.length || tokens[0].toLowerCase() !== 'curl') return null;

  let explicitMethod: string | null = null;
  let url: string | null = null;
  const rawHeaders: Array<[string, string]> = [];
  let body: string | null = null;
  let isGetForce = false;
  let isDigest = false;
  const formEntries: Array<{ key: string; value: string }> = [];
  let bodyType: RequestFormData['bodyType'] = 'json';
  let hasFormData = false;
  let hasUrlEncoded = false;
  let basicUser: string | null = null;
  let basicPass: string | null = null;

  let i = 1; // skip 'curl'
  while (i < tokens.length) {
    const tok = tokens[i];

    if (FLAGS_IGNORE.has(tok)) {
      if (tok === '--digest') isDigest = true;
      i++;
      continue;
    }

    if (FLAGS_WITH_VALUE.has(tok)) {
      const value = tokens[i + 1];
      i += 2;

      switch (tok) {
        case '-X':
        case '--request':
          explicitMethod = value.toUpperCase();
          break;

        case '-H':
        case '--header': {
          const parsed = parseHeaderString(value);
          if (parsed) rawHeaders.push(parsed);
          break;
        }

        case '-d':
        case '--data':
        case '--data-ascii':
        case '--data-raw':
        case '--data-binary':
          body = value;
          break;

        case '--data-urlencode': {
          // "key=value" or "key@file" - skip @file references
          if (!value.includes('@')) {
            const eqIdx = value.indexOf('=');
            if (eqIdx !== -1) {
              formEntries.push({ key: value.slice(0, eqIdx), value: value.slice(eqIdx + 1) });
            } else {
              formEntries.push({ key: value, value: '' });
            }
            hasUrlEncoded = true;
          }
          break;
        }

        case '-F':
        case '--form': {
          const eqIdx = value.indexOf('=');
          if (eqIdx !== -1) {
            formEntries.push({ key: value.slice(0, eqIdx), value: value.slice(eqIdx + 1) });
          } else {
            formEntries.push({ key: value, value: '' });
          }
          hasFormData = true;
          break;
        }

        case '-b':
        case '--cookie':
          rawHeaders.push(['Cookie', value]);
          break;

        case '-u':
        case '--user': {
          const colonIdx = value.indexOf(':');
          if (colonIdx !== -1) {
            basicUser = value.slice(0, colonIdx);
            basicPass = value.slice(colonIdx + 1);
          } else {
            basicUser = value;
            basicPass = '';
          }
          break;
        }

        case '-A':
        case '--user-agent':
          rawHeaders.push(['User-Agent', value]);
          break;

        case '-e':
        case '--referer':
          rawHeaders.push(['Referer', value]);
          break;

        case '--json':
          body = value;
          rawHeaders.push(['Content-Type', 'application/json']);
          rawHeaders.push(['Accept', 'application/json']);
          break;

        case '--url':
          if (!url) url = value;
          break;

        default:
          break;
      }
      continue;
    }

    // Combined short flags e.g. -GL, -Lk
    if (tok.startsWith('-') && !tok.startsWith('--') && tok.length > 2) {
      for (const f of tok.slice(1)) {
        if (f === 'G') isGetForce = true;
      }
      i++;
      continue;
    }

    if (tok === '-G' || tok === '--get') {
      isGetForce = true;
      i++;
      continue;
    }

    if (!tok.startsWith('-')) {
      if (!url) url = tok;
      i++;
      continue;
    }

    i++; // unknown flag - skip
  }

  if (!url) return null;

  const method = explicitMethod ?? (isGetForce ? 'GET' : (body !== null || hasFormData || hasUrlEncoded ? 'POST' : 'GET'));
  if (hasFormData) bodyType = 'form-data';
  else if (hasUrlEncoded) bodyType = 'x-www-form-urlencoded';

  return buildResult(method, url, rawHeaders, body, bodyType, formEntries, basicUser, basicPass, isDigest);
}

const PS_ESCAPE_MAP: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b' };

/**
 * Decode a PowerShell-quoted string value (without surrounding quotes):
 * - double-quoted content: backtick escapes (`" -> ", `n -> newline, `` -> `)
 * - single-quoted content: literal (`'' -> ' is the only escape)
 */
function decodePsStringContent(content: string, quote: '"' | "'"): string {
  if (quote === "'") return content.replace(/''/g, "'");
  return content.replace(/`(["'ntrb`])/g, (_m, c: string) => PS_ESCAPE_MAP[c] ?? c);
}

function parsePowerShellWebRequest(text: string): ParsedCurl | null {
  // Normalize backtick line continuations (PowerShell: ` at end of line)
  const normalized = text.replace(/`\r?\n\s*/g, ' ');

  let url: string | null = null;
  let method = 'GET';
  const rawHeaders: Array<[string, string]> = [];
  let body: string | null = null;

  // Extract value of a named PS parameter: -Flag 'value' or -Flag "value" or unquoted
  function extractParam(flag: string): string | null {
    const re = new RegExp(`${flag}\\s+(['"])((?:(?!\\1)[\\s\\S]|(?<=\`)[\\s\\S])*?)\\1`, 'i');
    const m = normalized.match(re);
    if (m) return decodePsStringContent(m[2], m[1] as '"' | "'");
    const re2 = new RegExp(`${flag}\\s+(\\S+)`, 'i');
    const m2 = normalized.match(re2);
    return m2 ? m2[1] : null;
  }

  url = extractParam('-Uri');

  const rawMethod = extractParam('-Method');
  if (rawMethod) method = rawMethod.toUpperCase();

  body = extractParam('-Body');

  const ct = extractParam('-ContentType');
  if (ct) rawHeaders.push(['Content-Type', ct]);

  // $session.UserAgent = "..."
  const uaMatch = normalized.match(/\$\w+\.UserAgent\s*=\s*(['"])((?:(?!\1)[\s\S]|(?<=`)[\s\S])*?)\1/i);
  if (uaMatch) rawHeaders.push(['User-Agent', decodePsStringContent(uaMatch[2], uaMatch[1] as '"' | "'")]);

  // $session.Cookies.Add((New-Object System.Net.Cookie("name", "value", ...)))
  const cookieRegex = /New-Object\s+System\.Net\.Cookie\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3/gi;
  const cookies: string[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = cookieRegex.exec(normalized)) !== null) {
    const name = decodePsStringContent(cm[2], cm[1] as '"' | "'");
    const value = decodePsStringContent(cm[4], cm[3] as '"' | "'");
    cookies.push(`${name}=${value}`);
  }
  if (cookies.length > 0) rawHeaders.push(['Cookie', cookies.join('; ')]);

  // -Headers @{ "key"="value"; ... }
  const headersBlockMatch = normalized.match(/-Headers\s+@\{([^}]+)\}/i);
  if (headersBlockMatch) {
    const block = headersBlockMatch[1];
    const pairRe = /(['"])((?:(?!\1)[\s\S]|`[\s\S])*?)\1\s*=\s*(['"])((?:(?!\3)[\s\S]|`[\s\S])*?)\3/g;
    let pm: RegExpExecArray | null;
    while ((pm = pairRe.exec(block)) !== null) {
      const key = decodePsStringContent(pm[2], pm[1] as '"' | "'");
      const val = decodePsStringContent(pm[4], pm[3] as '"' | "'");
      rawHeaders.push([key, val]);
    }
  }

  if (!url) return null;
  return buildResult(method, url, rawHeaders, body, 'json', [], null, null);
}

/**
 * Parse a curl (bash/cmd) or PowerShell Invoke-WebRequest/Invoke-RestMethod command
 * into request form fields. Returns null if the input cannot be parsed.
 */
export function parseCurlCommand(text: string): ParsedCurl | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('iwr ') ||
    lower.startsWith('irm ') ||
    lower.includes('invoke-webrequest') ||
    lower.includes('invoke-restmethod')
  ) {
    return parsePowerShellWebRequest(trimmed);
  }

  if (lower.startsWith('curl')) {
    return parseCurlBash(trimmed);
  }

  return null;
}
