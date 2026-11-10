import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollectionRunnerDialog } from '../../../components/CollectionRunnerDialog';
import { useSettingsStore } from '../../../store/settings/store';
import type { Collection } from '../../../store/collections/types';

const mocks = vi.hoisted(() => ({
  environment: null as { id: string; name: string; variables: { key: string; value: string; enabled: boolean }[] } | null,
  updateCurrentValues: vi.fn(),
  sendRequest: vi.fn(),
  setup: vi.fn(),
  teardown: vi.fn(),
  runPreRequest: vi.fn(),
  runTest: vi.fn(),
}));

vi.mock('../../../store/environments/store', () => ({
  useEnvironmentStore: () => ({
    environmentsData: { activeEnvironmentId: mocks.environment?.id ?? null, environments: mocks.environment ? [mocks.environment] : [] },
    updateCurrentValues: mocks.updateCurrentValues,
  }),
}));

vi.mock('../../../store/request/store', () => ({
  useRequestStore: () => ({ sendRequest: mocks.sendRequest }),
}));

vi.mock('../../../helpers/runner/isolation', () => ({
  createRunnerIsolation: () => ({ setup: mocks.setup, teardown: mocks.teardown }),
}));

vi.mock('../../../helpers/scriptRunner', () => ({
  browserScriptRunner: { runPreRequest: mocks.runPreRequest, runTest: mocks.runTest },
}));

function makeCollections(): Collection[] {
  return [
    {
      id: 'col-1',
      name: 'First',
      folders: [{ id: 'f-1', name: 'Users', collectionId: 'col-1' }],
      requests: [
        { id: 'r-1', name: 'Root Request', method: 'GET', url: '/', collectionId: 'col-1' },
        { id: 'r-2', name: 'Nested Request', method: 'GET', url: '/', collectionId: 'col-1', folderId: 'f-1' },
      ],
    },
    {
      id: 'col-2',
      name: 'Second',
      folders: [],
      requests: [{ id: 'r-3', name: 'Other Request', method: 'GET', url: '/', collectionId: 'col-2' }],
    },
  ];
}

describe('CollectionRunnerDialog (multi-collection)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.environment = null;
    mocks.setup.mockResolvedValue(undefined);
    mocks.teardown.mockResolvedValue(undefined);
    mocks.updateCurrentValues.mockResolvedValue(undefined);
    mocks.sendRequest.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, body: '{}', bodyEncoding: 'utf8', duration: 1 });
    mocks.runPreRequest.mockResolvedValue({ envOverrides: { token: 'pre' } });
    mocks.runTest.mockResolvedValue({ testResults: [], envOverrides: { token: 'final', newKey: 'value' } });

    // The dialog reads this from the real settings store; reset to the default.
    useSettingsStore.setState({ warnOnHttpErrors: true });
  });

  it('renders every request under its collection and folder headers', () => {
    render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={makeCollections()} />);

    expect(screen.getByText('Run: All Collections')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Root Request')).toBeInTheDocument();
    expect(screen.getByText('Nested Request')).toBeInTheDocument();
    expect(screen.getByText('Other Request')).toBeInTheDocument();
    expect(screen.getByText('3 requests')).toBeInTheDocument();
  });

  it('shows requests that arrive after mount (collections loaded late)', () => {
    const { rerender } = render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={[]} />);

    // The sidebar renders the dialog even when closed and the store's
    // collections can still be empty — nothing may crash here.
    expect(screen.queryByText('Root Request')).not.toBeInTheDocument();

    rerender(<CollectionRunnerDialog isOpen onClose={() => {}} collections={makeCollections()} />);

    // Regression: result entries must sync with the late-arriving list, or the
    // rows silently disappear (folders rendered, requests did not).
    expect(screen.getByText('Root Request')).toBeInTheDocument();
    expect(screen.getByText('Nested Request')).toBeInTheDocument();
    expect(screen.getByText('Other Request')).toBeInTheDocument();
  });

  it('renders a single collection without group headers', () => {
    render(
      <CollectionRunnerDialog isOpen onClose={() => {}} collections={[makeCollections()[0]]} />,
    );

    expect(screen.getByText('Run: First')).toBeInTheDocument();
    expect(screen.queryByText('First')).not.toBeInTheDocument(); // no group header
    expect(screen.getByText('Root Request')).toBeInTheDocument();
  });

  it('persists pre-request changes after restoration even if the request fails', async () => {
    mocks.environment = { id: 'env-1', name: 'Local', variables: [] };
    const collections = makeCollections();
    collections[0].requests[0].preRequestScript = 'set token';
    collections[0].requests[0].testScript = 'set final token';
    collections[1].requests[0].url = 'http://example.test/{{token}}';
    mocks.sendRequest
      .mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, body: '{}', duration: 1 })
      .mockRejectedValueOnce(new Error('network error'));
    render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={collections} />);

    await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
    await waitFor(() => expect(mocks.updateCurrentValues).toHaveBeenCalledWith('env-1', { token: 'pre' }));
    expect(mocks.teardown.mock.invocationCallOrder[0]).toBeLessThan(mocks.updateCurrentValues.mock.invocationCallOrder[0]);
    expect(mocks.sendRequest.mock.calls[2][0].url).toBe('http://example.test/pre');
  });

  it('persists the latest test overrides and does not persist without an active environment', async () => {
    mocks.environment = { id: 'env-1', name: 'Local', variables: [] };
    const collections = makeCollections();
    collections[0].requests[0].preRequestScript = 'pre';
    collections[0].requests[0].testScript = 'test';
    const { unmount } = render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={collections} />);
    await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
    await waitFor(() => expect(mocks.updateCurrentValues).toHaveBeenCalledWith('env-1', { token: 'final', newKey: 'value' }));
    unmount();

    mocks.environment = null;
    mocks.updateCurrentValues.mockClear();
    render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={collections} />);
    await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
    await waitFor(() => expect(mocks.teardown).toHaveBeenCalledTimes(2));
    expect(mocks.updateCurrentValues).not.toHaveBeenCalled();
  });

  it('does not write current values if workspace restoration fails', async () => {
    mocks.environment = { id: 'env-1', name: 'Local', variables: [] };
    mocks.teardown.mockRejectedValue(new Error('restore failed'));
    const collections = makeCollections();
    collections[0].requests[0].preRequestScript = 'pre';
    render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={collections} />);
    await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
    expect(await screen.findByText('restore failed')).toBeInTheDocument();
    expect(mocks.updateCurrentValues).not.toHaveBeenCalled();
  });

  it('saves completed script changes when a run is stopped', async () => {
    mocks.environment = { id: 'env-1', name: 'Local', variables: [] };
    const collections = makeCollections();
    collections[0].requests[1].preRequestScript = 'pre';
    mocks.sendRequest.mockImplementationOnce((_request, signal: AbortSignal) =>
      new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
    );
    render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={collections} />);
    await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
    await screen.findByRole('button', { name: /stop/i });
    await waitFor(() => expect(mocks.sendRequest).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: /stop/i }));
    await waitFor(() => expect(mocks.updateCurrentValues).toHaveBeenCalledWith('env-1', { token: 'pre' }));
    expect(mocks.sendRequest).toHaveBeenCalledTimes(1);
  });

  it('runs only requests in the selected folder', async () => {
    render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={[makeCollections()[0]]} folderId="f-1" />);
    await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
    await waitFor(() => expect(mocks.teardown).toHaveBeenCalled());
    expect(mocks.sendRequest).toHaveBeenCalledTimes(1);
  });

  describe('warnings and network errors', () => {
    function makeSingleRequestCollections(): Collection[] {
      return [
        {
          id: 'col-1',
          name: 'Only',
          folders: [],
          requests: [{ id: 'r-1', name: 'Solo Request', method: 'GET', url: '/', collectionId: 'col-1' }],
        },
      ];
    }

    // Regression: HTTP 500 with no tests used to count as a green "passed".
    it('marks a 5xx response with no tests as warned and keeps it out of the passed count', async () => {
      mocks.sendRequest.mockResolvedValue({ status: 500, statusText: 'Internal Server Error', headers: {}, body: '{}', bodyEncoding: 'utf8', duration: 1 });
      render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={makeSingleRequestCollections()} />);
      await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
      await waitFor(() => expect(mocks.teardown).toHaveBeenCalled());

      expect(screen.getByText('0 passed')).toBeInTheDocument();
      expect(screen.queryByText('1 failed')).not.toBeInTheDocument();
      expect(await screen.findByText('HTTP 500 Internal Server Error')).toBeInTheDocument(); // warn banner, row auto-expanded
      expect(screen.getByText('1 warnings')).toBeInTheDocument();
    });

    it('keeps a 5xx response passed when at least one test passes', async () => {
      mocks.sendRequest.mockResolvedValue({ status: 500, statusText: 'Internal Server Error', headers: {}, body: '{}', bodyEncoding: 'utf8', duration: 1 });
      mocks.runTest.mockResolvedValue({ testResults: [{ name: 'returns 500', passed: true }], envOverrides: {} });
      const collections = makeSingleRequestCollections();
      collections[0].requests[0].testScript = 'assert status is 500';
      render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={collections} />);
      await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
      await waitFor(() => expect(mocks.teardown).toHaveBeenCalled());

      expect(screen.getByText('1 passed')).toBeInTheDocument();
      expect(screen.queryByText('1 warnings')).not.toBeInTheDocument();
      expect(screen.queryByText('HTTP 500 Internal Server Error')).not.toBeInTheDocument();
    });

    it('suppresses warnings when the warn-on-HTTP-errors setting is disabled', async () => {
      useSettingsStore.setState({ warnOnHttpErrors: false });
      mocks.sendRequest.mockResolvedValue({ status: 500, statusText: 'Internal Server Error', headers: {}, body: '{}', bodyEncoding: 'utf8', duration: 1 });
      render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={makeSingleRequestCollections()} />);
      await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
      await waitFor(() => expect(mocks.teardown).toHaveBeenCalled());

      expect(screen.getByText('1 passed')).toBeInTheDocument();
      expect(screen.queryByText('1 warnings')).not.toBeInTheDocument();
      expect(screen.queryByText('HTTP 500 Internal Server Error')).not.toBeInTheDocument();
    });

    it('marks a GraphQL 200 response with an errors envelope as warned', async () => {
      mocks.sendRequest.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: {},
        body: JSON.stringify({ data: null, errors: [{ message: 'Not authorised' }, { message: 'Not authorised' }] }),
        bodyEncoding: 'utf8',
        duration: 1,
      });
      render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={makeSingleRequestCollections()} />);
      await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
      await waitFor(() => expect(mocks.teardown).toHaveBeenCalled());

      expect(screen.getByText('0 passed')).toBeInTheDocument();
      expect(await screen.findByText('GraphQL errors: 2 — Not authorised')).toBeInTheDocument();
      expect(screen.getByText('1 warnings')).toBeInTheDocument();
    });

    // Regression: the proxy controller wraps axios network failures in a
    // synthetic HTTP-200 response (status 0); the runner used to count it as
    // passed while the CLI reports error.
    it('marks a synthetic network-error response as error instead of passed', async () => {
      mocks.sendRequest.mockResolvedValue({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: JSON.stringify({ error: 'getaddrinfo ENOTFOUND example.test', code: 'ENOTFOUND' }),
        duration: 0,
      });
      render(<CollectionRunnerDialog isOpen onClose={() => {}} collections={makeSingleRequestCollections()} />);
      await userEvent.click(screen.getByRole('button', { name: /run collection/i }));
      await waitFor(() => expect(mocks.teardown).toHaveBeenCalled());

      expect(screen.getByText('0 passed')).toBeInTheDocument();
      expect(await screen.findByText('getaddrinfo ENOTFOUND example.test')).toBeInTheDocument(); // error banner, row auto-expanded
      expect(screen.getByText('1 errors')).toBeInTheDocument();
      expect(screen.queryByText('1 warnings')).not.toBeInTheDocument();
    });
  });
});
