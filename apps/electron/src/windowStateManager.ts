import { app, screen, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULTS: Omit<WindowState, 'x' | 'y' | 'isMaximized'> = {
  width: 1400,
  height: 900,
};

const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

function loadState(): WindowState | null {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'x' in parsed &&
      'y' in parsed &&
      'width' in parsed &&
      'height' in parsed &&
      'isMaximized' in parsed &&
      typeof (parsed as WindowState).x === 'number' &&
      typeof (parsed as WindowState).y === 'number' &&
      typeof (parsed as WindowState).width === 'number' &&
      typeof (parsed as WindowState).height === 'number' &&
      typeof (parsed as WindowState).isMaximized === 'boolean'
    ) {
      return parsed as WindowState;
    }
  } catch {
    // No file yet or corrupt — fall back to defaults
  }
  return null;
}

function saveState(state: WindowState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf-8');
  } catch {
    // Non-critical — ignore write failures
  }
}

/**
 * Returns true if the window rectangle is sufficiently visible on at least
 * one display. "Sufficient" means at least 100×50 px of the title-bar area
 * (top portion of the window) is inside a display's work area so the user
 * can always grab and move it.
 */
function isVisibleOnAnyDisplay(state: WindowState): boolean {
  const displays = screen.getAllDisplays();
  const TITLE_BAR_HEIGHT = 50;
  const MIN_VISIBLE_WIDTH = 100;

  for (const display of displays) {
    const wa = display.workArea;
    // Calculate horizontal overlap
    const overlapLeft = Math.max(state.x, wa.x);
    const overlapRight = Math.min(state.x + state.width, wa.x + wa.width);
    const horizontalOverlap = overlapRight - overlapLeft;

    // Check that the top of the window (title bar area) is within the work area vertically
    const titleBarBottom = state.y + TITLE_BAR_HEIGHT;
    const titleBarVisible = state.y < wa.y + wa.height && titleBarBottom > wa.y;

    if (horizontalOverlap >= MIN_VISIBLE_WIDTH && titleBarVisible) {
      return true;
    }
  }

  return false;
}

export function getInitialWindowState(): Pick<
  WindowState,
  'x' | 'y' | 'width' | 'height'
> & { isMaximized: boolean; hasPosition: boolean } {
  const saved = loadState();

  if (saved && isVisibleOnAnyDisplay(saved)) {
    return { ...saved, hasPosition: true };
  }

  // No valid saved state — use defaults without a position so Electron
  // centres the window automatically.
  return {
    width: DEFAULTS.width,
    height: DEFAULTS.height,
    x: 0,
    y: 0,
    isMaximized: false,
    hasPosition: false,
  };
}

export function attachWindowStateHandler(win: BrowserWindow): void {
  const persist = (): void => {
    if (win.isMaximized()) {
      // Only save the maximized flag; keep the previous normal bounds so
      // restoring from maximized goes back to a sensible size.
      const previous = loadState();
      saveState({
        x: previous?.x ?? 0,
        y: previous?.y ?? 0,
        width: previous?.width ?? DEFAULTS.width,
        height: previous?.height ?? DEFAULTS.height,
        isMaximized: true,
      });
      return;
    }

    const bounds = win.getBounds();
    saveState({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: false,
    });
  };

  win.on('resize', persist);
  win.on('move', persist);
  win.on('close', persist);
}
