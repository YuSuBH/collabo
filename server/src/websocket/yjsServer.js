import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_AUTH = 2;
const MESSAGE_QUERY_AWARENESS = 3;
const rooms = new Map();
const getOrCreateRoom = (roomName) => {
    let room = rooms.get(roomName);
    if (!room) {
        const doc = new Y.Doc();
        const awareness = new awarenessProtocol.Awareness(doc);
        // When the doc is updated, broadcast the update to all connected clients
        doc.on('update', (update, origin) => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_SYNC);
            syncProtocol.writeUpdate(encoder, update);
            const message = encoding.toUint8Array(encoder);
            room?.clients.forEach((client) => {
                if (client !== origin && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        });
        // When awareness changes, broadcast awareness update to all connected clients
        awareness.on('update', ({ added, updated, removed }, origin) => {
            const changedClients = added.concat(updated, removed);
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
            encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
            const message = encoding.toUint8Array(encoder);
            room?.clients.forEach((client) => {
                if (client !== origin && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        });
        room = {
            name: roomName,
            doc,
            awareness,
            clients: new Set(),
        };
        rooms.set(roomName, room);
    }
    return room;
};
const send = (ws, message) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
    }
};
export const setupYjsWebSocketServer = (server) => {
    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
    wss.on('connection', (ws, req) => {
        // Extract room name from query string (e.g. ?room=xyz) or path (e.g. /xyz)
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const roomParam = url.searchParams.get('room');
        const pathName = url.pathname.replace(/^\/+/, '').split('/')[0];
        const roomName = roomParam || pathName || 'default-room';
        console.log(`[Yjs WS] Client connected to room: ${roomName}`);
        const room = getOrCreateRoom(roomName);
        room.clients.add(ws);
        let isAlive = true;
        ws.on('pong', () => {
            isAlive = true;
        });
        // 1. Initial Sync Step 1: Send Sync Step 1 from server to client
        {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_SYNC);
            syncProtocol.writeSyncStep1(encoder, room.doc);
            send(ws, encoding.toUint8Array(encoder));
        }
        // 2. Send current awareness states to new client
        {
            const awarenessStates = room.awareness.getStates();
            if (awarenessStates.size > 0) {
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
                encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys())));
                send(ws, encoding.toUint8Array(encoder));
            }
        }
        // 3. Handle incoming binary messages from client
        ws.on('message', (data) => {
            try {
                let uint8Array;
                if (data instanceof ArrayBuffer) {
                    uint8Array = new Uint8Array(data);
                }
                else if (Array.isArray(data)) {
                    uint8Array = new Uint8Array(Buffer.concat(data));
                }
                else {
                    uint8Array = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
                }
                const decoder = decoding.createDecoder(uint8Array);
                const messageType = decoding.readVarUint(decoder);
                switch (messageType) {
                    case MESSAGE_SYNC: {
                        const encoder = encoding.createEncoder();
                        encoding.writeVarUint(encoder, MESSAGE_SYNC);
                        syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
                        if (encoding.length(encoder) > 1) {
                            send(ws, encoding.toUint8Array(encoder));
                        }
                        break;
                    }
                    case MESSAGE_AWARENESS: {
                        awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), ws);
                        break;
                    }
                    case MESSAGE_QUERY_AWARENESS: {
                        const encoder = encoding.createEncoder();
                        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
                        encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(room.awareness.getStates().keys())));
                        send(ws, encoding.toUint8Array(encoder));
                        break;
                    }
                    default:
                        console.warn(`[Yjs WS] Unknown message type: ${messageType}`);
                }
            }
            catch (err) {
                console.error('[Yjs WS] Error processing message:', err);
            }
        });
        // 4. Handle client disconnection
        ws.on('close', () => {
            console.log(`[Yjs WS] Client disconnected from room: ${roomName}`);
            room.clients.delete(ws);
        });
        ws.on('error', (err) => {
            console.error(`[Yjs WS] WebSocket error on room ${roomName}:`, err);
        });
    });
    // Heartbeat interval to ping clients every 30 seconds
    const pingInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        });
    }, 30000);
    wss.on('close', () => {
        clearInterval(pingInterval);
    });
    return wss;
};
//# sourceMappingURL=yjsServer.js.map