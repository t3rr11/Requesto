import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useItemDragDrop } from '../../hooks/useItemDragDrop';

function createDragEvent(overrides: Partial<React.DragEvent> = {}): React.DragEvent {
  const dataTransferData: Record<string, string> = {};
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: { contains: vi.fn(() => true) },
    dataTransfer: {
      types: overrides.dataTransfer?.types || ['application/request'],
      getData: vi.fn((key: string) => dataTransferData[key] || ''),
      setData: vi.fn((key: string, value: string) => {
        dataTransferData[key] = value;
      }),
      effectAllowed: 'move',
    },
    target: { style: { opacity: '' } },
    ...overrides,
  } as unknown as React.DragEvent;
}

describe('useItemDragDrop', () => {
  it('starts with no drag over state', () => {
    const { result } = renderHook(() => useItemDragDrop());
    expect(result.current.isDragOver).toBe(false);
    expect(result.current.dragOverIndex).toBeNull();
  });

  it('creates request drag handlers', () => {
    const { result } = renderHook(() => useItemDragDrop());
    const handlers = result.current.createRequestDragHandlers('req-1', 'col-1');
    expect(handlers.draggable).toBe(true);
    expect(typeof handlers.onDragStart).toBe('function');
    expect(typeof handlers.onDragEnd).toBe('function');
  });

  it('creates folder drag handlers', () => {
    const { result } = renderHook(() => useItemDragDrop());
    const handlers = result.current.createFolderDragHandlers('fld-1', 'col-1');
    expect(handlers.draggable).toBe(true);
    expect(typeof handlers.onDragStart).toBe('function');
    expect(typeof handlers.onDragEnd).toBe('function');
  });

  it('handleDragOver sets isDragOver for valid drag types', () => {
    const { result } = renderHook(() => useItemDragDrop());
    const event = createDragEvent({
      dataTransfer: { types: ['application/request'] } as unknown as DataTransfer,
    });

    act(() => result.current.handleDragOver(event));
    expect(result.current.isDragOver).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handleDragLeave clears isDragOver', () => {
    const { result } = renderHook(() => useItemDragDrop());
    const overEvent = createDragEvent({
      dataTransfer: { types: ['application/request'] } as unknown as DataTransfer,
    });
    act(() => result.current.handleDragOver(overEvent));
    expect(result.current.isDragOver).toBe(true);

    const leaveEvent = createDragEvent();
    act(() => result.current.handleDragLeave(leaveEvent));
    expect(result.current.isDragOver).toBe(false);
  });

  it('handleDragOverIndex sets dragOverIndex', () => {
    const { result } = renderHook(() => useItemDragDrop());
    const event = createDragEvent({
      dataTransfer: { types: ['application/request'] } as unknown as DataTransfer,
    });

    act(() => result.current.handleDragOverIndex(event, 3));
    expect(result.current.dragOverIndex).toBe(3);
  });

  it('handleDragLeaveIndex clears dragOverIndex', () => {
    const { result } = renderHook(() => useItemDragDrop());
    const event = createDragEvent({
      dataTransfer: { types: ['application/request'] } as unknown as DataTransfer,
    });
    act(() => result.current.handleDragOverIndex(event, 5));

    act(() => result.current.handleDragLeaveIndex());
    expect(result.current.dragOverIndex).toBeNull();
  });

  it('handleDrop calls onDropRequest callback', async () => {
    const onDropRequest = vi.fn();
    const { result } = renderHook(() => useItemDragDrop({ onDropRequest }));

    const event = createDragEvent();
    (event.dataTransfer.getData as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === 'application/request') return JSON.stringify({ requestId: 'req-1', collectionId: 'col-1' });
      return '';
    });
    Object.defineProperty(event.dataTransfer, 'types', { value: ['application/request'], writable: true });

    await act(() => result.current.handleDrop(event));
    expect(onDropRequest).toHaveBeenCalledWith('col-1', 'req-1');
  });

  it('handleDrop calls onDropFolder callback', async () => {
    const onDropFolder = vi.fn();
    const { result } = renderHook(() => useItemDragDrop({ onDropFolder }));

    const event = createDragEvent();
    (event.dataTransfer.getData as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === 'application/folder') return JSON.stringify({ folderId: 'fld-1', collectionId: 'col-1' });
      return '';
    });
    Object.defineProperty(event.dataTransfer, 'types', { value: ['application/folder'], writable: true });

    await act(() => result.current.handleDrop(event));
    expect(onDropFolder).toHaveBeenCalledWith('col-1', 'fld-1');
  });
});
