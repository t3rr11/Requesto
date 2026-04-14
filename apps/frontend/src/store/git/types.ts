export type GitFileChange = {
  path: string;
  index: string;
  workingDir: string;
};

export type GitStatus = {
  branch: string | null;
  ahead: number;
  behind: number;
  files: GitFileChange[];
  isClean: boolean;
};

export type GitCheckResult = {
  installed: boolean;
  isRepo: boolean;
  branch: string | null;
};

export type GitLogEntry = {
  hash: string;
  message: string;
  author: string;
  date: string;
};

export type GitRemote = {
  name: string;
  fetchUrl: string;
  pushUrl: string;
};

export type PullResult = {
  success: boolean;
  hadStash: boolean;
  conflicts: string[];
  message: string;
};

export type FileDiff = {
  path: string;
  diff: string;
};
