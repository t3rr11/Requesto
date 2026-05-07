import { useUpdateStore } from '../store/update/store';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface UpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpdateDialog({ isOpen, onClose }: UpdateDialogProps) {
  const { status, version, releaseNotes, progress, errorMessage, setDownloading, setError } = useUpdateStore();

  function handleClose() {
    onClose();
  }

  async function handleDownload() {
    setDownloading();
    try {
      await window.electronAPI?.update.download();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }

  function handleInstall() {
    onClose();
    window.electronAPI?.update.install();
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Update Available" size="sm">
      {status === 'available' && (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Version <span className="font-semibold text-gray-900 dark:text-gray-100">{version}</span> is available.
          </p>
          {releaseNotes && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">
                Release Notes
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {releaseNotes.replace(/<[^>]+>/g, '').trim()}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-5">
            <Button onClick={handleClose} variant="secondary" size="md">
              Later
            </Button>
            <Button onClick={handleDownload} variant="primary" size="md">
              Download Update
            </Button>
          </div>
        </>
      )}

      {status === 'downloading' && (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Downloading update…</p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>
          {progress && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {formatBytes(progress.transferred)} / {formatBytes(progress.total)} &mdash;{' '}
              {formatBytes(progress.bytesPerSecond)}/s
            </p>
          )}
          <div className="flex justify-end mt-5">
            <Button disabled variant="primary" size="md">
              Downloading…
            </Button>
          </div>
        </>
      )}

      {status === 'downloaded' && (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Version <span className="font-semibold text-gray-900 dark:text-gray-100">{version}</span> is ready to
            install. The app will restart automatically.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <Button onClick={onClose} variant="secondary" size="md">
              Later
            </Button>
            <Button onClick={handleInstall} variant="primary" size="md">
              Restart &amp; Install
            </Button>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">The update could not be downloaded.</p>
          {errorMessage && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
              {errorMessage}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-5">
            <Button onClick={onClose} variant="secondary" size="md">
              Close
            </Button>
            <Button onClick={handleDownload} variant="primary" size="md">
              Retry
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
