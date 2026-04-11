import { describe, it, expect, beforeEach } from 'vitest';
import { useAlertStore } from '../../store/alert/store';

describe('alert store', () => {
  beforeEach(() => {
    useAlertStore.setState({ isOpen: false, title: '', message: '', variant: 'info' });
  });

  it('starts closed', () => {
    const state = useAlertStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.variant).toBe('info');
  });

  it('opens with 3-arg form (title, message, variant)', () => {
    useAlertStore.getState().showAlert('Custom Title', 'Something went wrong', 'error');
    const state = useAlertStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe('Custom Title');
    expect(state.message).toBe('Something went wrong');
    expect(state.variant).toBe('error');
  });

  it('opens with 2-arg form (message, variant) using auto-title', () => {
    useAlertStore.getState().showAlert('Operation succeeded', 'success');
    const state = useAlertStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe('Success');
    expect(state.message).toBe('Operation succeeded');
    expect(state.variant).toBe('success');
  });

  it('defaults variant to info when only title and message provided', () => {
    useAlertStore.getState().showAlert('Title', 'Message');
    const state = useAlertStore.getState();
    expect(state.variant).toBe('info');
    expect(state.title).toBe('Title');
    expect(state.message).toBe('Message');
  });

  it('closes the alert', () => {
    useAlertStore.getState().showAlert('Test', 'error');
    useAlertStore.getState().closeAlert();
    expect(useAlertStore.getState().isOpen).toBe(false);
  });
});
