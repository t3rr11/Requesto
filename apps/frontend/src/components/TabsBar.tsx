import { useTabsStore } from '../store/useTabsStore';
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Tab Component
interface SortableTabProps {
  tabId: string;
  tab: any;
  isActive: boolean;
  onTabClick: (tabId: string) => void;
  onCloseTab: (e: React.MouseEvent, tabId: string) => void;
  getTabTitle: (tabId: string) => string;
}

const SortableTab = ({ tabId, tab, isActive, onTabClick, onCloseTab, getTabTitle }: SortableTabProps) => {
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
      {...attributes}
      {...listeners}
      onClick={() => onTabClick(tabId)}
      onAuxClick={e => {
        // Middle click (button 1) closes the tab
        if (e.button === 1) {
          e.preventDefault();
          onCloseTab(e, tabId);
        }
      }}
      title={getTabTitle(tabId)}
      className={`
        group flex items-center gap-2 px-4 border-r border-gray-300 dark:border-gray-600 cursor-grab active:cursor-grabbing
        transition-colors duration-150 flex-shrink-0 min-w-[120px] max-w-[200px] h-full
        ${
          isActive
            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-b-blue-500 dark:border-b-blue-700'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        }
      `}
    >
      {/* Tab label with dirty indicator */}
      <span className="flex-1 truncate select-none text-sm flex items-center gap-1">
        {tab.isDirty && (
          <span className="text-orange-500 dark:text-orange-400 font-bold text-xs" title="Unsaved changes">
            ●
          </span>
        )}
        <span className="truncate">{tab.label}</span>
      </span>

      {/* Close button */}
      <Button
        onClick={e => onCloseTab(e, tabId)}
        variant="icon"
        size="sm"
        className={`flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        aria-label={`Close ${tab.label}`}
      >
        <X size={14} />
      </Button>
    </div>
  );
};

export const TabsBar = () => {
  const { tabs, tabOrder, activeTabId, activateTab, closeTab, openNewTab, reorderTabs } = useTabsStore();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [tabToClose, setTabToClose] = useState<string | null>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabOrder.indexOf(active.id as string);
      const newIndex = tabOrder.indexOf(over.id as string);

      const newOrder = arrayMove(tabOrder, oldIndex, newIndex);
      reorderTabs(newOrder);
    }
  };

  // Check if scrolling is needed and update scroll button visibility
  const checkScrollButtons = () => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
  };

  // Check scroll buttons on mount and when tabs change
  useEffect(() => {
    checkScrollButtons();
    const container = tabsContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);

    return () => {
      container.removeEventListener('scroll', checkScrollButtons);
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [tabOrder]);

  const scrollTabs = (direction: 'left' | 'right') => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    const newScrollLeft =
      direction === 'left' ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;

    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  // Handle wheel scroll for horizontal scrolling
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal scroll if there's horizontal overflow
      if (container.scrollWidth > container.clientWidth) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + W to close active tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }

      // Ctrl/Cmd + T to open new tab
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        openNewTab();
      }

      // Ctrl/Cmd + Tab or Ctrl/Cmd + Shift + Tab for tab navigation
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = tabOrder.indexOf(activeTabId || '');
        if (currentIndex === -1) return;

        let nextIndex: number;
        if (e.shiftKey) {
          // Previous tab
          nextIndex = currentIndex > 0 ? currentIndex - 1 : tabOrder.length - 1;
        } else {
          // Next tab
          nextIndex = currentIndex < tabOrder.length - 1 ? currentIndex + 1 : 0;
        }

        const nextTabId = tabOrder[nextIndex];
        if (nextTabId) {
          activateTab(nextTabId);
        }
      }

      // Ctrl/Cmd + [1-9] to jump to specific tab
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex < tabOrder.length) {
          activateTab(tabOrder[tabIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabOrder, activateTab, closeTab, openNewTab]);

  const handleTabClick = (tabId: string) => {
    activateTab(tabId);
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs[tabId];

    // If tab has unsaved changes, show confirmation dialog
    if (tab?.isDirty) {
      setTabToClose(tabId);
    } else {
      closeTab(tabId);
    }
  };

  const confirmCloseTab = () => {
    if (tabToClose) {
      closeTab(tabToClose);
      setTabToClose(null);
    }
  };

  const cancelCloseTab = () => {
    setTabToClose(null);
  };

  const handleNewTab = () => {
    openNewTab();
  };

  const getTabTitle = (tabId: string) => {
    const tab = tabs[tabId];
    if (!tab) return '';

    let title = tab.label;
    if (tab.request.url) {
      title += `\n${tab.request.method} ${tab.request.url}`;
    }
    if (tab.isDirty) {
      title += '\n(unsaved changes)';
    }
    return title;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis]}
    >
      <div className="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex items-center h-10 relative dark:border-t dark:border-t-gray-700">
        {/* Left scroll button */}
        {showLeftScroll && (
          <Button
            onClick={() => scrollTabs('left')}
            variant="icon"
            className="absolute left-0 z-10 h-full px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-none border-r border-gray-300 dark:border-gray-600 shadow-[4px_0_8px_rgba(0,0,0,0.1)]"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </Button>
        )}

        {/* Tabs container with horizontal scroll - scrollbar hidden */}
        <div
          ref={tabsContainerRef}
          className="flex-1 flex items-stretch overflow-x-auto overflow-y-hidden h-full scrollbar-hide"
          style={{
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
        >
          <SortableContext items={tabOrder} strategy={horizontalListSortingStrategy}>
            {tabOrder.map(tabId => {
              const tab = tabs[tabId];
              if (!tab) return null;

              const isActive = tabId === activeTabId;

              return (
                <SortableTab
                  key={tabId}
                  tabId={tabId}
                  tab={tab}
                  isActive={isActive}
                  onTabClick={handleTabClick}
                  onCloseTab={handleCloseTab}
                  getTabTitle={getTabTitle}
                />
              );
            })}
          </SortableContext>
        </div>

        {/* Right scroll button */}
        {showRightScroll && (
          <Button
            onClick={() => scrollTabs('right')}
            variant="icon"
            className="absolute right-[42px] border-r z-10 h-full px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-none border-l border-gray-300 dark:border-gray-600 shadow-[-4px_0_8px_rgba(0,0,0,0.1)]"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </Button>
        )}

        {/* New tab button */}
        <Button
          onClick={handleNewTab}
          variant="icon"
          className="flex-shrink-0 p-2 px-3 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-none border-gray-300 dark:border-gray-600 h-full"
          aria-label="New tab"
          title="New tab (Ctrl/Cmd + T)"
        >
          <Plus size={18} />
        </Button>

        {/* Confirmation dialog for closing tabs with unsaved changes */}
        <ConfirmDialog
          isOpen={tabToClose !== null}
          onClose={cancelCloseTab}
          onConfirm={confirmCloseTab}
          title="Unsaved Changes"
          message={`Tab "${tabs[tabToClose || '']?.label || ''}" has unsaved changes. Are you sure you want to close it?`}
          confirmText="Close Tab"
          cancelText="Cancel"
          variant="warning"
        />
      </div>
    </DndContext>
  );
};
