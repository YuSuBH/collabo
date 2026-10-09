# Collabo

A real-time collaborative web IDE with multi-file support, live multi-cursor synchronization, code execution, and integrated AI assistant.

---

## Features

- **Real-Time Collaboration**: Multi-user editing powered by **Yjs** CRDTs and WebSockets with live cursor & selection tracking.
- **Monaco Code Editor**: VS Code-like editing experience with syntax highlighting, auto-completion, and customizable themes.
- **Code Execution**: Run code in multiple languages directly in the browser via Wandbox API.
- **AI Coding Assistant**: In-editor AI assistant powered by Google Gemini for code explanations, debugging, and suggestions.
- **Multi-File Workspace**: Create, switch, and manage files in real-time, with ZIP import/export support.
- **In-Room Chat & Presence**: Live text chat with unread indicators and active participant management.
- **Role & Access Controls**: Host permissions, read/write access toggles, and participant moderation.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Monaco Editor, Yjs, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express 5, TypeScript, `ws` (WebSockets), Google GenAI SDK
- **Execution**: Wandbox API proxy

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- `npm` or `pnpm` / `yarn`

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/YuSuBH/collabo.git
cd collabo

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Servers

**Start the Backend Server:**

```bash
cd server
npm run dev
```

**Start the Frontend Client:**

```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to start collaborating!

---

## Project Structure

```text
collabo/
├── client/          # Frontend React + Vite application
│   ├── src/
│   │   ├── components/  # Editor, Chat, Lobby, Header, etc.
│   │   ├── hooks/       # State & Yjs synchronization hooks
│   │   └── utils/       # Helper utilities
├── server/          # Backend Express + WebSocket server
│   ├── src/
│   │   ├── routes/      # AI and Code Execution API endpoints
│   │   └── websocket/   # Yjs WebSocket room relay
└── README.md
```

---

## License

This project is licensed under the [ISC License](LICENSE).
