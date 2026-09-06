import { useEffect, useState } from 'react';
import { AlertCircle, Check, ChevronRight, Copy, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../Button';
import { fetchFullTokens } from '../../store/oauth/actions';
import type { OAuthFullTokens } from '../../store/oauth/types';
import { decodeJwtPayload, orderJwtClaims } from '../../helpers/oauth/decodeJwt';
import { formatTimeUntilExpiry } from '../../helpers/oauth/expiry';

interface TokenDetailsProps {
  configId: string;
  collapsible?: boolean;
}

const TOKEN_LABELS = {
  accessToken: 'Access Token',
  refreshToken: 'Refresh Token',
  idToken: 'ID Token',
} as const;

type TokenKind = keyof typeof TOKEN_LABELS;

const DATE_KEYS = new Set(['exp', 'iat', 'nbf']);

/** True when formatParsedValue actually converts the value (epoch or ISO date claim). */
function hasDateConversion(key: string, value: unknown): boolean {
  if (!DATE_KEYS.has(key)) return false;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return !Number.isNaN(Date.parse(value));
  return false;
}

/** The claim exactly as it appears in the JSON payload. */
function formatRawValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Human-friendly interpretation; epoch/ISO timestamps get converted. */
function formatParsedValue(key: string, value: unknown): string {
  if (DATE_KEYS.has(key)) {
    if (typeof value === 'number') {
      const iso = new Date(value * 1000).toISOString();
      return key === 'exp' ? `${iso} (${formatTimeUntilExpiry(value * 1000)})` : iso;
    }
    if (typeof value === 'string') {
      const ms = Date.parse(value);
      if (!Number.isNaN(ms)) {
        const iso = new Date(ms).toISOString();
        return key === 'exp' ? `${iso} (${formatTimeUntilExpiry(ms)})` : iso;
      }
    }
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button variant="icon" size="sm" title="Copy raw token" onClick={handleCopy}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function JwtClaimsView({ token }: { token: string }) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const claims = orderJwtClaims(payload);

  return (
    <table className="w-full text-left border-collapse" data-testid="jwt-claims">
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
        {claims.map(([key, value]) => {
          const raw = formatRawValue(value);
          const parsed = formatParsedValue(key, value);
          const hasHover = hasDateConversion(key, value);
          return (
            <tr key={key} className="align-top">
              <td className="px-3 py-1.5 w-28 shrink-0">
                <code className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">{key}</code>
              </td>
              <td className="px-3 py-1.5">
                <code
                  title={hasHover ? parsed : undefined}
                  className={`text-xs font-mono text-gray-700 dark:text-gray-300 break-all whitespace-pre-wrap ${
                    hasHover ? 'underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 cursor-help' : ''
                  }`}
                >
                  {raw}
                </code>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TokenSection({ kind, token }: { kind: TokenKind; token: string }) {
  const isJwt = decodeJwtPayload(token) !== null;

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700/50">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{TOKEN_LABELS[kind]}</span>
        {isJwt && <span className="text-[11px] text-gray-400 dark:text-gray-500">JWT</span>}
        <span className="ml-auto">
          <CopyButton text={token} />
        </span>
      </div>
      {isJwt ? (
        <JwtClaimsView token={token} />
      ) : (
        <div className="px-3 py-2">
          <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all whitespace-pre-wrap">
            {token}
          </code>
        </div>
      )}
    </div>
  );
}

function TokenBody({
  tokens,
  loading,
  error,
  onRetry,
}: {
  tokens: OAuthFullTokens | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error || !tokens) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error ?? 'No tokens stored'}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  const expired = tokens.expiresAt !== undefined && Date.now() >= tokens.expiresAt;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
        <span
          className={`px-1.5 py-0.5 rounded font-medium ${
            expired
              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
          }`}
        >
          {expired ? 'Expired' : formatTimeUntilExpiry(tokens.expiresAt)}
        </span>
        {tokens.tokenType && <span>Type: {tokens.tokenType}</span>}
        {tokens.obtainedAt && <span>Obtained {new Date(tokens.obtainedAt).toLocaleString()}</span>}
        {tokens.scope && <span className="break-all">Scope: {tokens.scope}</span>}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          title="Fetch current tokens again"
          onClick={onRetry}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {(['accessToken', 'refreshToken', 'idToken'] as TokenKind[]).map(kind => {
        const token = tokens[kind];
        if (!token) return null;
        return <TokenSection key={kind} kind={kind} token={token} />;
      })}
    </div>
  );
}

export function TokenDetails({ configId, collapsible = false }: TokenDetailsProps) {
  const [tokens, setTokens] = useState<OAuthFullTokens | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [expanded, setExpanded] = useState(!collapsible);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFullTokens(configId)
      .then(result => {
        if (!cancelled) setTokens(result);
      })
      .catch(err => {
        if (!cancelled) {
          setTokens(null);
          setError(err instanceof Error ? err.message : 'Failed to load tokens');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [configId, reloadKey, expanded]);

  if (!collapsible) {
    return (
      <div data-testid="token-details">
        <TokenBody tokens={tokens} loading={loading} error={error} onRetry={() => setReloadKey(k => k + 1)} />
      </div>
    );
  }

  const expired = tokens?.expiresAt !== undefined && Date.now() >= tokens.expiresAt;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" data-testid="token-details">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer text-left"
        aria-expanded={expanded}
      >
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Token Details</span>
        {tokens && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              expired
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
            }`}
          >
            {expired ? 'Expired' : formatTimeUntilExpiry(tokens.expiresAt)}
          </span>
        )}
      </button>
      {expanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <TokenBody tokens={tokens} loading={loading} error={error} onRetry={() => setReloadKey(k => k + 1)} />
        </div>
      )}
    </div>
  );
}
