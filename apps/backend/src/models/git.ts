export interface PullResult {
  success: boolean;
  hadStash: boolean;
  conflicts: string[];
  message: string;
}

export interface FileDiff {
  path: string;
  diff: string;
}
