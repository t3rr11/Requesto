import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../store/ui/store';

describe('ui store', () => {
  beforeEach(() => {
    useUIStore.setState({
      isSidebarOpen: true,
      sidebarWidth: 320,
      requestPanelWidth: 600,
      requestPanelHeight: 400,
      panelLayout: 'horizontal',
      isConsoleOpen: false,
      consoleHeight: 250,
      expandedCollections: new Set(),
      expandedFolders: new Set(),
      selectedRequestIds: new Set(),
      lastSelectedRequestId: null,
    });
  });

  describe('sidebar', () => {
    it('toggles sidebar', () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
    });

    it('sets sidebar width', () => {
      useUIStore.getState().setSidebarWidth(400);
      expect(useUIStore.getState().sidebarWidth).toBe(400);
    });
  });

  describe('panel layout', () => {
    it('toggles layout between horizontal and vertical', () => {
      useUIStore.getState().togglePanelLayout();
      expect(useUIStore.getState().panelLayout).toBe('vertical');
      useUIStore.getState().togglePanelLayout();
      expect(useUIStore.getState().panelLayout).toBe('horizontal');
    });

    it('sets layout directly', () => {
      useUIStore.getState().setPanelLayout('vertical');
      expect(useUIStore.getState().panelLayout).toBe('vertical');
    });
  });

  describe('console', () => {
    it('toggles console', () => {
      useUIStore.getState().toggleConsole();
      expect(useUIStore.getState().isConsoleOpen).toBe(true);
    });

    it('sets console height', () => {
      useUIStore.getState().setConsoleHeight(300);
      expect(useUIStore.getState().consoleHeight).toBe(300);
    });
  });

  describe('collection/folder expand', () => {
    it('toggles collection expand', () => {
      useUIStore.getState().toggleCollection('c1');
      expect(useUIStore.getState().expandedCollections.has('c1')).toBe(true);
      useUIStore.getState().toggleCollection('c1');
      expect(useUIStore.getState().expandedCollections.has('c1')).toBe(false);
    });

    it('expands a collection', () => {
      useUIStore.getState().expandCollection('c2');
      expect(useUIStore.getState().expandedCollections.has('c2')).toBe(true);
    });

    it('toggles folder expand', () => {
      useUIStore.getState().toggleFolder('f1');
      expect(useUIStore.getState().expandedFolders.has('f1')).toBe(true);
      useUIStore.getState().toggleFolder('f1');
      expect(useUIStore.getState().expandedFolders.has('f1')).toBe(false);
    });
  });

  describe('multi-select', () => {
    it('selects a single request (no ctrl)', () => {
      useUIStore.getState().toggleRequestSelection('r1', false, false);
      expect(useUIStore.getState().selectedRequestIds.has('r1')).toBe(true);
      expect(useUIStore.getState().selectedRequestIds.size).toBe(1);
    });

    it('adds to selection with ctrl', () => {
      useUIStore.getState().toggleRequestSelection('r1', false, false);
      useUIStore.getState().toggleRequestSelection('r2', true, false);
      expect(useUIStore.getState().selectedRequestIds.size).toBe(2);
    });

    it('toggles off with ctrl', () => {
      useUIStore.getState().toggleRequestSelection('r1', false, false);
      useUIStore.getState().toggleRequestSelection('r1', true, false);
      expect(useUIStore.getState().selectedRequestIds.size).toBe(0);
    });

    it('range selects with shift', () => {
      const ids = ['r1', 'r2', 'r3', 'r4'];
      useUIStore.getState().toggleRequestSelection('r1', false, false, ids);
      useUIStore.getState().toggleRequestSelection('r3', false, true, ids);
      expect(useUIStore.getState().selectedRequestIds.size).toBe(3);
    });

    it('clears selection', () => {
      useUIStore.getState().toggleRequestSelection('r1', false, false);
      useUIStore.getState().clearSelection();
      expect(useUIStore.getState().selectedRequestIds.size).toBe(0);
    });
  });
});
