import type { Awareness } from "y-protocols/awareness";

/** How long (ms) a remote cursor can be idle before it fades out. */
const IDLE_TIMEOUT_MS = 3_000;

/** How often (ms) the idle-check runs. */
const IDLE_CHECK_INTERVAL_MS = 1_000;

/**
 * Injects base layout CSS for remote cursors & selections.
 * Critically, the cursor head uses `border-left: 2px solid currentColor`
 * so that when we set `el.style.color` via JS, the border colour follows
 * automatically — no separate border-color rule needed.
 */
export const injectCursorStyles = () => {
  const BASE_STYLE_ID = "yjs-monaco-cursor-base";
  if (document.getElementById(BASE_STYLE_ID)) return;

  const style = document.createElement("style");
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
      transition: opacity 0.4s ease;
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
    }

    /* Selection highlight — also fades when idle */
    [class*="yRemoteSelection"]:not([class*="yRemoteSelectionHead"]) {
      transition: opacity 0.4s ease;
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

/**
 * Applies inline colors to cursor/selection elements.
 * Also restores opacity for peers that have recently become active again.
 */
const applyInlineColors = (
  container: HTMLElement,
  awareness: Awareness,
  lastActivity: Map<number, number>,
) => {
  const states = awareness.getStates();
  const now = Date.now();

  // ── Cursor heads ──────────────────────────────────────────────────────────
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

      // Seed lastActivity for peers first seen mid-session (e.g. via MutationObserver
      // firing before the corresponding awareness change arrives). Without this,
      // lastActivity.get() returns undefined → falls back to 0 → looks instantly idle.
      if (!lastActivity.has(clientId)) {
        lastActivity.set(clientId, now);
      }

      // Guard: only write if value changed (prevents observer re-trigger loop)
      if (el.dataset.yjsColor !== color) {
        el.style.setProperty("color", color, "important");
        el.dataset.yjsColor = color;
      }

      // Restore opacity if the peer just became active again
      const isIdle = now - (lastActivity.get(clientId)!) > IDLE_TIMEOUT_MS;
      if (!isIdle && el.dataset.yjsIdle === "1") {
        el.style.setProperty("opacity", "1", "important");
        el.dataset.yjsIdle = "0";
      }

      // ── Name badge ──────────────────────────────────────────────────────
      let badge = el.querySelector<HTMLElement>(".yRemoteNameBadge");
      if (!badge && name) {
        badge = document.createElement("span");
        badge.className = "yRemoteNameBadge";
        badge.dataset.yjsBadge = "1";
        el.appendChild(badge);
      }
      if (badge) {
        if (badge.dataset.yjsName !== name) {
          badge.textContent = name ?? "";
          badge.dataset.yjsName = name ?? "";
        }
        if (badge.dataset.yjsBg !== color) {
          badge.style.setProperty("background-color", color, "important");
          badge.dataset.yjsBg = color;
        }
      }
    });

  // ── Selection highlights ───────────────────────────────────────────────────
  container
    .querySelectorAll<HTMLElement>('[class*="yRemoteSelection-"]')
    .forEach((el) => {
      if (el.className.includes("yRemoteSelectionHead")) return;
      const match = el.className.match(/yRemoteSelection-(\d+)/);
      if (!match) return;
      const clientId = parseInt(match[1], 10);
      const color = states.get(clientId)?.user?.color as string | undefined;
      if (!color) return;
      const bg = hexToRgba(color, 0.3);
      if (el.dataset.yjsBg !== bg) {
        el.style.setProperty("background-color", bg, "important");
        el.dataset.yjsBg = bg;
      }
    });
};

/**
 * Hides cursor heads and selection highlights for peers that have been
 * idle longer than IDLE_TIMEOUT_MS, and restores them when they become active.
 */
const applyIdleState = (
  container: HTMLElement,
  lastActivity: Map<number, number>,
) => {
  const now = Date.now();

  // Fade idle cursor heads
  container
    .querySelectorAll<HTMLElement>('[class*="yRemoteSelectionHead-"]')
    .forEach((el) => {
      const match = el.className.match(/yRemoteSelectionHead-(\d+)/);
      if (!match) return;
      const clientId = parseInt(match[1], 10);
      const isIdle = now - (lastActivity.get(clientId) ?? 0) > IDLE_TIMEOUT_MS;
      const wasIdle = el.dataset.yjsIdle === "1";

      if (isIdle && !wasIdle) {
        el.style.setProperty("opacity", "0", "important");
        el.dataset.yjsIdle = "1";
      } else if (!isIdle && wasIdle) {
        el.style.setProperty("opacity", "1", "important");
        el.dataset.yjsIdle = "0";
      }
    });

  // Fade idle selection highlights
  container
    .querySelectorAll<HTMLElement>('[class*="yRemoteSelection-"]')
    .forEach((el) => {
      if (el.className.includes("yRemoteSelectionHead")) return;
      const match = el.className.match(/yRemoteSelection-(\d+)/);
      if (!match) return;
      const clientId = parseInt(match[1], 10);
      const isIdle = now - (lastActivity.get(clientId) ?? 0) > IDLE_TIMEOUT_MS;
      const wasIdle = el.dataset.yjsIdle === "1";

      if (isIdle && !wasIdle) {
        el.style.setProperty("opacity", "0", "important");
        el.dataset.yjsIdle = "1";
      } else if (!isIdle && wasIdle) {
        el.style.setProperty("opacity", "1", "important");
        el.dataset.yjsIdle = "0";
      }
    });
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts a MutationObserver on the Monaco editor DOM node that:
 *   1. Applies user-profile colours to remote cursor elements the instant
 *      Monaco inserts them into the DOM (inline styles beat any CSS).
 *   2. Re-applies on every awareness change (new joiners, reconnects).
 *   3. Fades out cursors that have been idle for longer than IDLE_TIMEOUT_MS.
 *
 * Returns a cleanup function — call it when the binding is destroyed.
 */
export const startCursorColorObserver = (
  container: HTMLElement,
  awareness: Awareness,
): (() => void) => {
  /** Timestamp of the last awareness update per remote clientId. */
  const lastActivity = new Map<number, number>();

  // Pre-populate lastActivity for peers already in the room.
  // Without this, peers present before we start observing have no entry,
  // so lastActivity.get() returns undefined → fallback 0 → immediately idle.
  const now = Date.now();
  awareness.getStates().forEach((_, clientId) => {
    if (clientId !== awareness.clientID) {
      lastActivity.set(clientId, now);
    }
  });

  const apply = () => applyInlineColors(container, awareness, lastActivity);

  // Watch for any new elements added under the editor
  const observer = new MutationObserver(apply);
  observer.observe(container, {
    childList: true,
    subtree: true,
    // Watch attribute changes so re-positioned cursors (class updates) are caught
    attributes: true,
    attributeFilter: ["class"],
  });

  // Track per-peer activity from awareness change events.
  // The event fires with { added, updated, removed } arrays of clientIds.
  const onAwarenessChange = (changes: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const now = Date.now();
    [...changes.added, ...changes.updated].forEach((clientId) => {
      // Ignore our own client
      if (clientId !== awareness.clientID) {
        lastActivity.set(clientId, now);
      }
    });
    // Clean up departed peers
    changes.removed.forEach((clientId) => lastActivity.delete(clientId));
    apply();
  };

  awareness.on("change", onAwarenessChange);

  // Periodically check which peers have gone idle and fade their cursors
  const idleTimer = setInterval(
    () => applyIdleState(container, lastActivity),
    IDLE_CHECK_INTERVAL_MS,
  );

  // Initial pass for already-present cursors
  apply();

  return () => {
    observer.disconnect();
    awareness.off("change", onAwarenessChange);
    clearInterval(idleTimer);
  };
};
