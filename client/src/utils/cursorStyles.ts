import type { Awareness } from 'y-protocols/awareness';

/**
 * Injects base layout CSS for remote cursors & selections.
 * Critically, the cursor head uses `border-left: 2px solid currentColor`
 * so that when we set `el.style.color` via JS, the border colour follows
 * automatically — no separate border-color rule needed.
 */
export const injectCursorStyles = () => {
  const BASE_STYLE_ID = 'yjs-monaco-cursor-base';
  if (document.getElementById(BASE_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = BASE_STYLE_ID;
  style.textContent = `
    /* Cursor caret — color is set via inline style by startCursorColorObserver */
    [class*="yRemoteSelectionHead"] {
      position: absolute;
      border-left: 2px solid currentColor !important;
      height: 100%;
      box-sizing: border-box;
      pointer-events: none;
      z-index: 10;
    }

    /* Cursor tip dot — inherits currentColor from parent */
    [class*="yRemoteSelectionHead"]::after {
      position: absolute;
      content: ' ';
      border: 3px solid currentColor;
      border-radius: 4px;
      left: -4px;
      top: -5px;
    }

    /* Name badge */
    [class*="yRemoteSelectionHead"] .yRemoteNameBadge {
      position: absolute;
      top: -22px;
      left: -2px;
      font-size: 10px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #fff;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      line-height: 14px;
      letter-spacing: 0.02em;
      box-shadow: 0 2px 6px rgba(0,0,0,0.45);
      opacity: 0.95;
    }
  `;
  document.head.appendChild(style);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/** Applies inline styles to every remote cursor/selection element in the editor DOM. */
const applyInlineColors = (container: HTMLElement, awareness: Awareness) => {
  const states = awareness.getStates();

  // ── Cursor heads ──────────────────────────────────────────────────────────
  // Setting `color` on the element propagates to border via `currentColor`
  // and to the ::after tip dot.
  container
    .querySelectorAll<HTMLElement>('[class*="yRemoteSelectionHead-"]')
    .forEach((el) => {
      const match = el.className.match(/yRemoteSelectionHead-(\d+)/);
      if (!match) return;
      const clientId = parseInt(match[1], 10);
      const state = states.get(clientId);
      const color = state?.user?.color as string | undefined;
      const name = state?.user?.name as string | undefined;
      if (!color) return;

      // Guard: only write if value changed (prevents observer re-trigger loop)
      if (el.dataset.yjsColor !== color) {
        el.style.setProperty('color', color, 'important');
        el.dataset.yjsColor = color;
      }

      // ── Name badge ──────────────────────────────────────────────────────
      let badge = el.querySelector<HTMLElement>('.yRemoteNameBadge');
      if (!badge && name) {
        badge = document.createElement('span');
        badge.className = 'yRemoteNameBadge';
        badge.dataset.yjsBadge = '1';
        el.appendChild(badge);
      }
      if (badge) {
        // Guard: only write text/color if they changed
        if (badge.dataset.yjsName !== name) {
          badge.textContent = name ?? '';
          badge.dataset.yjsName = name ?? '';
        }
        if (badge.dataset.yjsBg !== color) {
          badge.style.setProperty('background-color', color, 'important');
          badge.dataset.yjsBg = color;
        }
      }
    });

  // ── Selection highlights ───────────────────────────────────────────────────
  container
    .querySelectorAll<HTMLElement>('[class*="yRemoteSelection-"]')
    .forEach((el) => {
      // Skip cursor heads (they share the yRemoteSelection- prefix in some versions)
      if (el.className.includes('yRemoteSelectionHead')) return;
      const match = el.className.match(/yRemoteSelection-(\d+)/);
      if (!match) return;
      const clientId = parseInt(match[1], 10);
      const color = states.get(clientId)?.user?.color as string | undefined;
      if (!color) return;
      const bg = hexToRgba(color, 0.3);
      // Guard: only write if value changed
      if (el.dataset.yjsBg !== bg) {
        el.style.setProperty('background-color', bg, 'important');
        el.dataset.yjsBg = bg;
      }
    });
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts a MutationObserver on the Monaco editor DOM node that:
 *   1. Applies user-profile colours to remote cursor elements the instant
 *      Monaco inserts them into the DOM (inline styles beat any CSS).
 *   2. Re-applies on every awareness change (new joiners, reconnects).
 *
 * Returns a cleanup function — call it when the binding is destroyed.
 */
export const startCursorColorObserver = (
  container: HTMLElement,
  awareness: Awareness,
): (() => void) => {
  const apply = () => applyInlineColors(container, awareness);

  // Watch for any new elements added under the editor
  const observer = new MutationObserver(apply);
  observer.observe(container, {
    childList: true,
    subtree: true,
    // Watch attribute changes so re-positioned cursors (class updates) are caught
    attributes: true,
    attributeFilter: ['class'],
  });

  // Also re-run when awareness itself changes (e.g. user joins/leaves/reconnects)
  awareness.on('change', apply);

  // Initial pass for already-present cursors
  apply();

  return () => {
    observer.disconnect();
    awareness.off('change', apply);
  };
};


