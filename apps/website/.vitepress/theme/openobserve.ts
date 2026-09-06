import { openobserveRum } from '@openobserve/browser-rum';
import { openobserveLogs } from '@openobserve/browser-logs';
import { version } from '../../../../package.json';

export function initOpenObserve() {
  if (typeof window === 'undefined') return;

  const siteUrl = import.meta.env.OO_SITE;
  const clientToken = import.meta.env.OO_CLIENT_TOKEN;
  const organizationIdentifier = import.meta.env.OO_ORGANIZATION_ID;
  const environment = import.meta.env.OO_ENVIRONMENT || 'production';

  if (!siteUrl || !clientToken || !organizationIdentifier) return;

  const url = new URL(/^https?:\/\//.test(siteUrl) ? siteUrl : `https://${siteUrl}`);

  const common = {
    clientToken,
    site: url.host,
    organizationIdentifier,
    service: 'requesto-website',
    env: environment,
    version,
    insecureHTTP: url.protocol === 'http:',
    apiVersion: 'v1',
  };

  openobserveRum.init({
    ...common,
    applicationId: 'requesto-website',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    defaultPrivacyLevel: 'mask-user-input',
  });

  openobserveLogs.init({
    ...common,
    forwardErrorsToLogs: true,
  });
}
