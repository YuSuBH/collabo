/**
 * Global CSS injected for Yjs Monaco remote cursors & selection highlights.
 * y-monaco applies .yRemoteSelection and .yRemoteSelectionHead to Monaco decorations.
 */
export const injectCursorStyles = () => {
  const styleId = 'yjs-monaco-cursor-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .yRemoteSelection {
      opacity: 0.35;
      border-radius: 2px;
    }

    .yRemoteSelectionHead {
      position: absolute;
      border-left: 2px solid;
      border-top: 2px solid;
      border-bottom: 2px solid;
      height: 100%;
      box-sizing: border-box;
      pointer-events: none;
      z-index: 10;
    }

    .yRemoteSelectionHead::after {
      position: absolute;
      content: ' ';
      border: 3px solid;
      border-radius: 4px;
      left: -4px;
      top: -5px;
    }

    /* Small remote cursor name badge hover / display */
    .yRemoteSelectionHead .yRemoteNameBadge {
      position: absolute;
      top: -18px;
      left: -2px;
      font-size: 11px;
      font-weight: 600;
      font-family: inherit;
      color: #ffffff;
      padding: 1px 6px;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      line-height: 14px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }
  `;
  document.head.appendChild(style);
};
