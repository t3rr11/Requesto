import { describe, it, expect } from 'vitest';
import { shouldShowBackendCrashDialog } from './backendExitDecision';

describe('shouldShowBackendCrashDialog', () => {
  it('returns false when the app is intentionally quitting', () => {
    expect(
      shouldShowBackendCrashDialog({
        exitCode: 1,
        isQuitting: true,
        backendReady: true,
        healthCheckOk: false,
      }),
    ).toBe(false);
  });

  it('returns false when the backend exits cleanly (code 0)', () => {
    expect(
      shouldShowBackendCrashDialog({
        exitCode: 0,
        isQuitting: false,
        backendReady: true,
        healthCheckOk: false,
      }),
    ).toBe(false);
  });

  it('returns false when exit code is null (signal-only termination)', () => {
    expect(
      shouldShowBackendCrashDialog({
        exitCode: null,
        isQuitting: false,
        backendReady: false,
      }),
    ).toBe(false);
  });

  it('returns true on a hard exit before the backend ever became ready (real startup crash)', () => {
    expect(
      shouldShowBackendCrashDialog({
        exitCode: 1,
        isQuitting: false,
        backendReady: false,
      }),
    ).toBe(true);
  });

  it('returns false when ready and a follow-up health probe still succeeds (false-positive guard)', () => {
    expect(
      shouldShowBackendCrashDialog({
        exitCode: 1,
        isQuitting: false,
        backendReady: true,
        healthCheckOk: true,
      }),
    ).toBe(false);
  });

  it('returns true when ready and the follow-up health probe fails (real runtime crash)', () => {
    expect(
      shouldShowBackendCrashDialog({
        exitCode: 1,
        isQuitting: false,
        backendReady: true,
        healthCheckOk: false,
      }),
    ).toBe(true);
  });
});
