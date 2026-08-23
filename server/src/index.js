import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { setupYjsWebSocketServer } from './websocket/yjsServer.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
// Health Check API
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'collaborative-coding-backend',
    });
});
const server = http.createServer(app);
// Mount Yjs WebSocket relay
setupYjsWebSocketServer(server);
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Yjs WebSocket relay active on ws://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map