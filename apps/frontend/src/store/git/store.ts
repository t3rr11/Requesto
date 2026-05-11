import { create } from 'zustand';
import type { GitStatus, GitLogEntry, GitRemote, PullResult, FileDiff } from './types';
import * as actions from './actions';

type GitState = {
  isGitInstalled: boolean;
  isRepo: boolean;
  branch: string | null;
  branches: string[];
  remoteBranches: string[];
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
  loadBranches: () => Promise<void>;
  initRepo: () => Promise<void>;
  commit: (message: string) => Promise<string>;
  push: () => Promise<void>;
  pull: () => Promise<PullResult>;
  addRemote: (name: string, url: string) => Promise<void>;
  resolveConflicts: (strategy: 'ours' | 'theirs', file?: string) => Promise<void>;
  loadDiff: (file?: string) => Promise<FileDiff[]>;
  createBranch: (name: string, from?: string) => Promise<void>;
  checkoutBranch: (branch: string) => Promise<void>;
  deleteBranch: (name: string, force?: boolean) => Promise<void>;
  renameBranch: (oldName: string, newName: string) => Promise<void>;
  reset: () => void;
};

export const useGitStore = create<GitState>((set) => ({
  isGitInstalled: false,
  isRepo: false,
  branch: null,
  branches: [],
  remoteBranches: [],
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
  loadBranches: () => actions.loadBranches(set),
  initRepo: () => actions.initRepo(set),
  commit: (message) => actions.commit(set, message),
  push: () => actions.push(set),
  pull: () => actions.pull(set),
  addRemote: (name, url) => actions.addRemote(set, name, url),
  resolveConflicts: (strategy, file) => actions.resolveConflicts(set, strategy, file),
  loadDiff: (file) => actions.loadDiff(set, file),
  createBranch: (name, from) => actions.createBranch(set, name, from),
  checkoutBranch: (branch) => actions.checkoutBranch(set, branch),
  deleteBranch: (name, force) => actions.deleteBranch(set, name, force),
  renameBranch: (oldName, newName) => actions.renameBranch(set, oldName, newName),
  reset: () =>
    set({
      isRepo: false,
      branch: null,
      branches: [],
      remoteBranches: [],
      status: null,
      log: [],
      remotes: [],
      conflicts: [],
    }),
}));
