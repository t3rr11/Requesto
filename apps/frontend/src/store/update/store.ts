import { create } from 'zustand';
import type { UpdateStatus, UpdateProgress, UpdateInfo } from './types';

interface UpdateState {
  status: UpdateStatus;
  version: string | null;
  releaseNotes: string | null;
  progress: UpdateProgress | null;
  errorMessage: string | null;
  dialogOpen: boolean;
  setAvailable: (info: UpdateInfo) => void;
  setDownloading: () => void;
  setProgress: (progress: UpdateProgress) => void;
  setDownloaded: () => void;
  setError: (message: string) => void;
  setDialogOpen: (open: boolean) => void;
  reset: () => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  status: 'idle',
  version: null,
  releaseNotes: null,
  progress: null,
  errorMessage: null,
  dialogOpen: false,
  setAvailable: (info) => set({ status: 'available', version: info.version, releaseNotes: info.releaseNotes }),
  setDownloading: () => set({ status: 'downloading', progress: null }),
  setProgress: (progress) => set({ progress }),
  setDownloaded: () => set({ status: 'downloaded', progress: null }),
  setError: (message) => set({ status: 'error', errorMessage: message }),
  setDialogOpen: (open) => set({ dialogOpen: open }),
  reset: () => set({ status: 'idle', version: null, releaseNotes: null, progress: null, errorMessage: null, dialogOpen: false }),
}));
