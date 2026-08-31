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
const DEFAULT_STARTER_CODE = `// 🚀 Welcome to Collaborative CodeSync!
// Open this same URL in another browser tab to experience real-time sync & remote cursors.

interface User {
  id: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

function greetCollaborator(user: User): string {
  return \`👋 Hello \${user.name}, you are currently editing with live CRDT sync!\`;
}

console.log(greetCollaborator({ id: '1', name: 'Collaborator', role: 'editor' }));
`;
const rooms = new Map();
export const getRoomActiveColors = (roomName) => {
    const room = rooms.get(roomName);
    if (!room)
        return [];
    const colors = [];
    room.awareness.getStates().forEach((state) => {
        if (state.user && typeof state.user.color === 'string') {
            colors.push(state.user.color);
        }
    });
    return colors;
};
const send = (ws, message) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(message, (err) => {
            if (err) {
                console.error('[Yjs WS] Error sending message to client:', err);
            }
        });
    }
};
const getOrCreateRoom = (roomName) => {
    let room = rooms.get(roomName);
    if (!room) {
        const doc = new Y.Doc();
        const awareness = new awarenessProtocol.Awareness(doc);
        const clients = new Set();
        // Pre-populate with default starter file if new room
        const filesMap = doc.getMap('files');
        if (filesMap.size === 0) {
            const mainFile = new Y.Text();
            mainFile.insert(0, DEFAULT_STARTER_CODE);
            filesMap.set('main.js', mainFile);
        }
        const newRoom = {
            name: roomName,
            doc,
            awareness,
            clients,
        };
        rooms.set(roomName, newRoom);
        // Broadcast doc updates to all clients in the room except the origin
        doc.on('update', (update, origin) => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_SYNC);
            syncProtocol.writeUpdate(encoder, update);
            const message = encoding.toUint8Array(encoder);
            newRoom.clients.forEach((client) => {
                if (client !== origin && client.readyState === WebSocket.OPEN) {
                    send(client, message);
                }
            });
        });
        // Broadcast awareness updates (remote cursors, presence)
        awareness.on('update', ({ added, updated, removed }, origin) => {
            const changedClients = added.concat(updated, removed);
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
            encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
            const message = encoding.toUint8Array(encoder);
            newRoom.clients.forEach((client) => {
                if (client !== origin && client.readyState === WebSocket.OPEN) {
                    send(client, message);
                }
            });
        });
        return newRoom;
    }
    return room;
};
export const setupYjsWebSocketServer = (server) => {
    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
    wss.on('connection', (ws, req) => {
        // Extract room name from query params or path
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const roomParam = url.searchParams.get('room');
        const pathName = url.pathname.replace(/^\/+/, '').split('/')[0];
        const roomName = roomParam || pathName || 'demo-room';
        console.log(`[Yjs WS] Client connected -> Room: "${roomName}" (Total in room: ${getOrCreateRoom(roomName).clients.size + 1})`);
        const room = getOrCreateRoom(roomName);
        room.clients.add(ws);
        // Track awareness client IDs owned by this WebSocket connection
        const controlledUserIds = new Set();
        // 1. Initial Sync: Send SyncStep1 to client
        {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_SYNC);
            syncProtocol.writeSyncStep1(encoder, room.doc);
            send(ws, encoding.toUint8Array(encoder));
        }
        // 2. Send current awareness states to newly connected client
        {
            const awarenessStates = room.awareness.getStates();
            if (awarenessStates.size > 0) {
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
                encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys())));
                send(ws, encoding.toUint8Array(encoder));
            }
        }
        // 3. Handle messages from client
        ws.on('message', (data) => {
            try {
                let uint8Array;
                if (data instanceof ArrayBuffer) {
                    uint8Array = new Uint8Array(data);
                }
                else if (Array.isArray(data)) {
                    uint8Array = new Uint8Array(Buffer.concat(data));
                }
                else if (Buffer.isBuffer(data)) {
                    uint8Array = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
                }
                else {
                    uint8Array = new Uint8Array(data);
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
                        const awarenessUpdate = decoding.readVarUint8Array(decoder);
                        try {
                            const tempDecoder = decoding.createDecoder(awarenessUpdate);
                            const len = decoding.readVarUint(tempDecoder);
                            for (let i = 0; i < len; i++) {
                                const clientID = decoding.readVarUint(tempDecoder);
                                decoding.readVarUint(tempDecoder); // clock
                                const stateStr = decoding.readVarString(tempDecoder);
                                const state = JSON.parse(stateStr);
                                if (state === null) {
                                    controlledUserIds.delete(clientID);
                                }
                                else {
                                    controlledUserIds.add(clientID);
                                }
                            }
                        }
                        catch (err) {
                            console.error('[Yjs WS] Error decoding awareness update client IDs:', err);
                        }
                        awarenessProtocol.applyAwarenessUpdate(room.awareness, awarenessUpdate, ws);
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
                        console.warn(`[Yjs WS] Unhandled message type: ${messageType}`);
                }
            }
            catch (err) {
                console.error('[Yjs WS] Error processing client message:', err);
            }
        });
        // 4. Handle client disconnection: immediately remove awareness presence
        ws.on('close', () => {
            room.clients.delete(ws);
            if (controlledUserIds.size > 0) {
                awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(controlledUserIds), null);
            }
            console.log(`[Yjs WS] Client disconnected <- Room: "${roomName}" (Remaining: ${room.clients.size})`);
        });
        ws.on('error', (err) => {
            console.error(`[Yjs WS] Client socket error on room "${roomName}":`, err);
        });
    });
    // Keep-alive heartbeat
    const pingInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        });
    }, 25000);
    wss.on('close', () => {
        clearInterval(pingInterval);
    });
    return wss;
};
//# sourceMappingURL=yjsServer.js.map