import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { setupYjsWebSocketServer, getRoomActiveColors } from './websocket/yjsServer.js';
import { aiRouter } from './routes/ai.js';
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
// Room Active Colors API
app.get('/api/rooms/:roomId/colors', (req, res) => {
    const { roomId } = req.params;
    const colors = getRoomActiveColors(roomId);
    res.json({ roomId, colors });
});
// Mount AI Proxy Routes
app.use('/api/ai', aiRouter);
const server = http.createServer(app);
// Mount Yjs WebSocket relay
setupYjsWebSocketServer(server);
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Yjs WebSocket relay active on ws://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map