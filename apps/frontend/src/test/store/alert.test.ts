import { describe, it, expect, beforeEach } from 'vitest';
import { useAlertStore } from '../../store/alert/store';

describe('alert store (toast queue)', () => {
  beforeEach(() => {
    useAlertStore.setState({ toasts: [] });
  });

  it('starts with no toasts', () => {
    expect(useAlertStore.getState().toasts).toEqual([]);
  });

  it('queues a toast with 3-arg form (title, message, variant)', () => {
    useAlertStore.getState().showAlert('Custom Title', 'Something went wrong', 'error');
    const { toasts } = useAlertStore.getState();
    expect(toasts).toHaveLength(1);
    const t = toasts[0]!;
    expect(t.title).toBe('Custom Title');
    expect(t.message).toBe('Something went wrong');
    expect(t.variant).toBe('error');
    // Errors stay until dismissed.
    expect(t.durationMs).toBe(0);
  });

  it('queues a toast with 2-arg form (message, variant) using auto-title', () => {
    useAlertStore.getState().showAlert('Operation succeeded', 'success');
    const t = useAlertStore.getState().toasts[0]!;
    expect(t.title).toBe('Success');
    expect(t.message).toBe('Operation succeeded');
    expect(t.variant).toBe('success');
    expect(t.durationMs).toBeGreaterThan(0);
  });

  it('defaults variant to info when only title and message provided', () => {
    useAlertStore.getState().showAlert('Title', 'Message');
    const t = useAlertStore.getState().toasts[0]!;
    expect(t.variant).toBe('info');
    expect(t.title).toBe('Title');
    expect(t.message).toBe('Message');
  });

  it('queues multiple toasts', () => {
    useAlertStore.getState().showAlert('one', 'success');
    useAlertStore.getState().showAlert('two', 'success');
    expect(useAlertStore.getState().toasts).toHaveLength(2);
  });

  it('dismisses a toast by id', () => {
    useAlertStore.getState().showAlert('one', 'success');
    useAlertStore.getState().showAlert('two', 'success');
    const [first] = useAlertStore.getState().toasts;
    useAlertStore.getState().dismissToast(first!.id);
    const remaining = useAlertStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.message).toBe('two');
  });

  it('clears all toasts', () => {
    useAlertStore.getState().showAlert('one', 'success');
    useAlertStore.getState().showAlert('two', 'success');
    useAlertStore.getState().clearToasts();
    expect(useAlertStore.getState().toasts).toEqual([]);
  });
});
