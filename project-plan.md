# High-Level Project Blueprint: Collaborative Code Editor

## 1. Project Goal

A lightweight, web-based collaborative IDE prototype. Multiple users can edit code together in real-time, chat, ask an AI about the code, and execute the multi-file project inside a secure, isolated container.

## 2. Core Architecture (Thick Client, Thin Server)

- **Frontend (React/Vite):** Holds the UI, the Code Editor, and the "Source of Truth" for document state using CRDTs.
- **Backend (Node.js/Express):** Acts merely as a dumb relay. It broadcasts WebSocket messages between users and securely proxies HTTP requests to external APIs.
- **Execution Engine (Piston via Docker):** A standalone local Docker container that receives code, runs it in a sandbox, and returns the output.

## 3. Technology Stack

- **UI & Editor:** React, `@monaco-editor/react`
- **Real-Time Engine:** `yjs`, `y-monaco`, `y-websocket` (CRDTs)
- **Backend/Proxy:** Node.js, Express, `ws`
- **Code Runner:** Piston Engine (Self-hosted Docker `ghcr.io/engineer-man/piston`)
- **AI/LLM:** Google Gemini or OpenAI API (Proxied through backend)
- **File I/O:** `jszip`, `file-saver` (Pure client-side)

## 4. State Management Concept

**NO DATABASE.** All collaborative state lives in memory within a single `Yjs` Document shared via WebSockets.

- **Files:** A Yjs Map (`FileName` -> `FileContent`). **Strictly a flat directory** (no subfolders).
- **Chat:** A Yjs Array appended with message objects.
- **Cursors/Presence:** Ephemeral Yjs "Awareness" states (color, name, cursor position).

## 5. Feature Modules & Data Flow

1.  **Live Editing & Cursors:** Editor instances bind directly to the Yjs document. Changes sync automatically over WebSockets.
2.  **File Tree:** UI reads the Yjs Map. Clicking a file changes the active string bound to the Monaco Editor.
3.  **Local I/O (ZIP):** Clicking Export bundles the Yjs Map into a ZIP via browser memory. Import unzips a file and populates the Yjs Map.
4.  **Code Execution:** React packages all files from the Yjs Map -> Sends HTTP POST to Node.js Backend -> Node.js forwards to Piston Docker -> Output displayed in UI.
5.  **Context-Aware AI Chat:** React grabs the active file's code + user prompt -> Sends HTTP POST to Node.js Backend -> Node.js queries LLM -> Response displayed in side panel.

## 6. Strict Constraints (AI Agent Directives)

- **DO NOT** implement User Authentication or Login.
- **DO NOT** implement a persistent Database (MongoDB, Postgres, etc.).
- **DO NOT** implement nested folders/directories (keep the file tree 100% flat).
- **DO NOT** implement "ghost text" or inline AI auto-complete.
- **DO NOT** expose API keys in the React frontend. Always proxy through Node.js.
