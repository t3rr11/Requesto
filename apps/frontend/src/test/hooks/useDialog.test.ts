import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDialog, useDialogWithData, useConfirmDialog } from '../../hooks/useDialog';

describe('useDialog', () => {
  it('starts closed by default', () => {
    const { result } = renderHook(() => useDialog());
    expect(result.current.isOpen).toBe(false);
  });

  it('starts open when defaultOpen is true', () => {
    const { result } = renderHook(() => useDialog(true));
    expect(result.current.isOpen).toBe(true);
  });

  it('opens and closes', () => {
    const { result } = renderHook(() => useDialog());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('toggles', () => {
    const { result } = renderHook(() => useDialog());
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });
});

describe('useDialogWithData', () => {
  it('starts with no data', () => {
    const { result } = renderHook(() => useDialogWithData<string>());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('opens with data', () => {
    const { result } = renderHook(() => useDialogWithData<{ id: string }>());
    act(() => result.current.open({ id: 'test-123' }));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.data).toEqual({ id: 'test-123' });
  });

  it('clears data after close with delay', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDialogWithData<string>());
    act(() => result.current.open('hello'));
    expect(result.current.data).toBe('hello');
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    // Data persists briefly for animation
    expect(result.current.data).toBe('hello');
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.data).toBeNull();
    vi.useRealTimers();
  });

  it('toggle with data sets data', () => {
    const { result } = renderHook(() => useDialogWithData<number>());
    act(() => result.current.toggle(42));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.data).toBe(42);
  });
});

describe('useConfirmDialog', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useConfirmDialog());
    expect(result.current.isOpen).toBe(false);
  });

  it('opens with config', () => {
    const { result } = renderHook(() => useConfirmDialog());
    const onConfirm = vi.fn();
    act(() =>
      result.current.open({ title: 'Delete?', message: 'Are you sure?', onConfirm }),
    );
    expect(result.current.isOpen).toBe(true);
    expect(result.current.props.title).toBe('Delete?');
    expect(result.current.props.message).toBe('Are you sure?');
  });

  it('calls onConfirm and closes', async () => {
    const { result } = renderHook(() => useConfirmDialog());
    const onConfirm = vi.fn();
    act(() =>
      result.current.open({ title: 'Test', message: 'Confirm?', onConfirm }),
    );
    await act(() => result.current.props.onConfirm());
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(result.current.isOpen).toBe(false);
  });

  it('close does not call onConfirm', () => {
    const { result } = renderHook(() => useConfirmDialog());
    const onConfirm = vi.fn();
    act(() =>
      result.current.open({ title: 'Test', message: 'Msg', onConfirm }),
    );
    act(() => result.current.close());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it('spreads variant and button text into props', () => {
    const { result } = renderHook(() => useConfirmDialog());
    act(() =>
      result.current.open({
        title: 'Warning',
        message: 'Careful!',
        variant: 'danger',
        confirmText: 'Yes',
        cancelText: 'No',
        onConfirm: vi.fn(),
      }),
    );
    expect(result.current.props.variant).toBe('danger');
    expect(result.current.props.confirmText).toBe('Yes');
    expect(result.current.props.cancelText).toBe('No');
  });
});
