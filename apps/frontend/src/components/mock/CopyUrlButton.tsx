import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../Button';
import { useAlertStore } from '../../store/alert/store';

interface CopyUrlButtonProps {
  url: string | null;
}

export function CopyUrlButton({ url }: Readonly<CopyUrlButtonProps>) {
  const { showAlert } = useAlertStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showAlert('Mock Server', 'Failed to copy URL', 'error');
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant="icon"
      size="sm"
      title="Copy endpoint URL"
      disabled={!url}
      aria-label="Copy endpoint URL"
      className="mr-1 shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}
