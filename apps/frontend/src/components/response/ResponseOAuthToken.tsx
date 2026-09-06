import { TokenDetails } from '../oauth/TokenDetails';

interface ResponseOAuthTokenProps {
  configId: string;
}

export function ResponseOAuthToken({ configId }: Readonly<ResponseOAuthTokenProps>) {
  return (
    <div className="h-full overflow-y-auto p-4" data-testid="response-oauth-token">
      <TokenDetails configId={configId} />
    </div>
  );
}
