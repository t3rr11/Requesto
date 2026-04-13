import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTabsStore } from '../store/tabs/store';
import { ConfirmDialog } from './ConfirmDialog';
import { EnvironmentSelectorCompact } from './EnvironmentSelector';

interface SortableTabProps {
  tabId: string;
  label: string;
  isActive: boolean;
  isDirty: boolean;
  onActivate: () => void;
  onClose: (e: React.MouseEvent) => void;
  onAuxClick: (e: React.MouseEvent) => void;
}

function SortableTab({ tabId, label, isActive, isDirty, onActivate, onClose, onAuxClick }: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tabId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-tab-id={tabId}
      {...attributes}
      {...listeners}
      onClick={onActivate}
      onAuxClick={onAuxClick}
      onMouseDown={e => { if (e.button === 1) e.preventDefault(); }}
      className={`group flex items-center gap-2 px-4 border-r border-gray-300 dark:border-gray-600 cursor-grab active:cursor-grabbing transition-colors shrink-0 min-w-30 max-w-50 h-full text-sm whitespace-nowrap select-none ${
        isActive
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-b-blue-500 dark:border-b-blue-700'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      <span className="flex-1 truncate flex items-center gap-1">
        {isDirty && (
          <span className="text-orange-500 dark:text-orange-400 font-bold text-xs" title="Unsaved changes">
            ●
          </span>
        )}
        <span className="truncate">{label}</span>
      </span>
      <button
        onClick={onClose}
        className={`p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        aria-label={`Close ${label}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function TabsBar() {
  const {
    tabs,
    tabOrder,
    activeTabId,
    activateTab,
    closeTab,
    openNewTab,
    reorderTabs,
  } = useTabsStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons);
    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      observer.disconnect();
    };
  }, [tabOrder.length, updateScrollButtons]);

  // Auto-scroll to active tab when it changes
  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  // Handle wheel scroll for horizontal scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        // Use deltaY (vertical scroll → horizontal) or deltaX (trackpad horizontal)
        el.scrollLeft += e.deltaY || e.deltaX;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const tab = tabs[tabId];
      if (tab?.isDirty) {
        setPendingCloseTabId(tabId);
      } else {
        closeTab(tabId);
      }
    },
    [tabs, closeTab],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = tabOrder.indexOf(active.id as string);
      const newIndex = tabOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = [...tabOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id as string);
      reorderTabs(newOrder);
    },
    [tabOrder, reorderTabs],
  );

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollTo({
      left: scrollRef.current.scrollLeft + (direction === 'left' ? -200 : 200),
      behavior: 'smooth',
    });
  };

  const orderedTabs = useMemo(
    () => tabOrder.map(id => tabs[id]).filter(Boolean),
    [tabOrder, tabs],
  );

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToHorizontalAxis]}>
        <div className="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex items-center h-10 shrink-0">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="shrink-0 h-full px-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border-r border-gray-300 dark:border-gray-600"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex-1 flex items-stretch overflow-x-auto overflow-y-hidden h-full scrollbar-hide min-w-0"
          >
            <SortableContext items={tabOrder} strategy={horizontalListSortingStrategy}>
              {orderedTabs.map(tab => (
                <SortableTab
                  key={tab.id}
                  tabId={tab.id}
                  label={tab.label}
                  isActive={tab.id === activeTabId}
                  isDirty={tab.isDirty}
                  onActivate={() => activateTab(tab.id)}
                  onClose={e => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  onAuxClick={e => {
                    if (e.button === 1) {
                      e.preventDefault();
                      handleCloseTab(tab.id);
                    }
                  }}
                />
              ))}
            </SortableContext>
          </div>

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="shrink-0 h-full px-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border-l border-gray-300 dark:border-gray-600"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={openNewTab}
            className="shrink-0 px-3 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 h-full border-l border-gray-300 dark:border-gray-600"
            aria-label="New tab"
            title="New tab"
          >
            <Plus size={18} />
          </button>

          <div className="shrink-0 flex items-center px-2 border-l border-gray-300 dark:border-gray-600 h-full">
            <EnvironmentSelectorCompact />
          </div>
        </div>
      </DndContext>

      <ConfirmDialog
        isOpen={pendingCloseTabId !== null}
        onClose={() => setPendingCloseTabId(null)}
        onConfirm={() => {
          if (pendingCloseTabId) {
            closeTab(pendingCloseTabId);
            setPendingCloseTabId(null);
          }
        }}
        title="Unsaved Changes"
        message="This tab has unsaved changes. Close it anyway?"
        confirmText="Close"
        variant="warning"
      />
    </>
  );
}
