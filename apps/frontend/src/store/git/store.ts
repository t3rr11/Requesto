import { create } from 'zustand';
import type { GitStatus, GitLogEntry, GitRemote, PullResult, FileDiff } from './types';
import * as actions from './actions';

type GitState = {
  isGitInstalled: boolean;
  isRepo: boolean;
  branch: string | null;
  status: GitStatus | null;
  log: GitLogEntry[];
  remotes: GitRemote[];
  conflicts: string[];
  diffs: FileDiff[];
  statusLoading: boolean;
  operating: boolean;
  pushing: boolean;
  pulling: boolean;
  diffLoading: boolean;

  checkGit: () => Promise<void>;
  loadStatus: () => Promise<void>;
  loadLog: () => Promise<void>;
  loadRemotes: () => Promise<void>;
  initRepo: () => Promise<void>;
  commit: (message: string) => Promise<string>;
  push: () => Promise<void>;
  pull: () => Promise<PullResult>;
  addRemote: (name: string, url: string) => Promise<void>;
  resolveConflicts: (strategy: 'ours' | 'theirs', file?: string) => Promise<void>;
  loadDiff: (file?: string) => Promise<FileDiff[]>;
  reset: () => void;
};

export const useGitStore = create<GitState>((set) => ({
  isGitInstalled: false,
  isRepo: false,
  branch: null,
  status: null,
  log: [],
  remotes: [],
  conflicts: [],
  diffs: [],
  statusLoading: false,
  operating: false,
  pushing: false,
  pulling: false,
  diffLoading: false,

  checkGit: () => actions.checkGit(set),
  loadStatus: () => actions.loadStatus(set),
  loadLog: () => actions.loadLog(set),
  loadRemotes: () => actions.loadRemotes(set),
  initRepo: () => actions.initRepo(set),
  commit: (message) => actions.commit(set, message),
  push: () => actions.push(set),
  pull: () => actions.pull(set),
  addRemote: (name, url) => actions.addRemote(set, name, url),
  resolveConflicts: (strategy, file) => actions.resolveConflicts(set, strategy, file),
  loadDiff: (file) => actions.loadDiff(set, file),
  reset: () =>
    set({
      isRepo: false,
      branch: null,
      status: null,
      log: [],
      remotes: [],
      conflicts: [],
    }),
}));
