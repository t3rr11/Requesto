import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useItemContextMenu } from '../../hooks/useItemContextMenu';
import type { SavedRequest } from '../../store/collections/types';

const mockRequest: SavedRequest = {
  id: 'req-1',
  name: 'Get Users',
  method: 'GET',
  url: 'https://api.example.com/users',
  collectionId: 'col-1',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function createMouseEvent(x: number, y: number): React.MouseEvent {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    clientX: x,
    clientY: y,
  } as unknown as React.MouseEvent;
}

describe('useItemContextMenu', () => {
  it('starts with all context menus null', () => {
    const { result } = renderHook(() => useItemContextMenu());
    expect(result.current.requestContextMenu).toBeNull();
    expect(result.current.collectionContextMenu).toBeNull();
    expect(result.current.folderContextMenu).toBeNull();
  });

  it('opens and closes request context menu', () => {
    const { result } = renderHook(() => useItemContextMenu());
    const event = createMouseEvent(100, 200);

    act(() => result.current.openRequestContextMenu(event, mockRequest));
    expect(result.current.requestContextMenu).toEqual({
      x: 100,
      y: 200,
      request: mockRequest,
    });

    act(() => result.current.closeRequestContextMenu());
    expect(result.current.requestContextMenu).toBeNull();
  });

  it('opens and closes collection context menu', () => {
    const { result } = renderHook(() => useItemContextMenu());
    const event = createMouseEvent(50, 75);

    act(() => result.current.openCollectionContextMenu(event, 'col-1', 'My API'));
    expect(result.current.collectionContextMenu).toEqual({
      x: 50,
      y: 75,
      collectionId: 'col-1',
      collectionName: 'My API',
    });

    act(() => result.current.closeCollectionContextMenu());
    expect(result.current.collectionContextMenu).toBeNull();
  });

  it('opens and closes folder context menu', () => {
    const { result } = renderHook(() => useItemContextMenu());
    const event = createMouseEvent(300, 400);

    act(() => result.current.openFolderContextMenu(event, 'col-1', 'fld-1', 'Endpoints'));
    expect(result.current.folderContextMenu).toEqual({
      x: 300,
      y: 400,
      collectionId: 'col-1',
      folderId: 'fld-1',
      folderName: 'Endpoints',
    });

    act(() => result.current.closeFolderContextMenu());
    expect(result.current.folderContextMenu).toBeNull();
  });

  it('prevents default and stops propagation on open', () => {
    const { result } = renderHook(() => useItemContextMenu());
    const event = createMouseEvent(10, 20);

    act(() => result.current.openRequestContextMenu(event, mockRequest));
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });
});
