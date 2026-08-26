import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'http';
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

interface Room {
  name: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
}

const rooms = new Map<string, Room>();

const send = (ws: WebSocket, message: Uint8Array) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message, (err) => {
      if (err) {
        console.error('[Yjs WS] Error sending message to client:', err);
      }
    });
  }
};

const getOrCreateRoom = (roomName: string): Room => {
  let room = rooms.get(roomName);
  if (!room) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    const clients = new Set<WebSocket>();

    // Pre-populate with default starter code if new room
    const ytext = doc.getText('monaco');
    if (ytext.length === 0) {
      ytext.insert(0, DEFAULT_STARTER_CODE);
    }

    const newRoom: Room = {
      name: roomName,
      doc,
      awareness,
      clients,
    };
    rooms.set(roomName, newRoom);

    // Broadcast doc updates to all clients in the room except the origin
    doc.on('update', (update: Uint8Array, origin: any) => {
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
    awareness.on(
      'update',
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: any
      ) => {
        const changedClients = added.concat(updated, removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        const message = encoding.toUint8Array(encoder);

        newRoom.clients.forEach((client) => {
          if (client !== origin && client.readyState === WebSocket.OPEN) {
            send(client, message);
          }
        });
      }
    );

    return newRoom;
  }
  return room;
};

export const setupYjsWebSocketServer = (server: Server) => {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Extract room name from query params or path
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const roomParam = url.searchParams.get('room');
    const pathName = url.pathname.replace(/^\/+/, '').split('/')[0];
    const roomName = roomParam || pathName || 'demo-room';

    console.log(`[Yjs WS] Client connected -> Room: "${roomName}" (Total in room: ${getOrCreateRoom(roomName).clients.size + 1})`);
    const room = getOrCreateRoom(roomName);
    room.clients.add(ws);

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
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            room.awareness,
            Array.from(awarenessStates.keys())
          )
        );
        send(ws, encoding.toUint8Array(encoder));
      }
    }

    // 3. Handle messages from client
    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        let uint8Array: Uint8Array;
        if (data instanceof ArrayBuffer) {
          uint8Array = new Uint8Array(data);
        } else if (Array.isArray(data)) {
          uint8Array = new Uint8Array(Buffer.concat(data));
        } else if (Buffer.isBuffer(data)) {
          uint8Array = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        } else {
          uint8Array = new Uint8Array(data as any);
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
            awarenessProtocol.applyAwarenessUpdate(
              room.awareness,
              decoding.readVarUint8Array(decoder),
              ws
            );
            break;
          }
          case MESSAGE_QUERY_AWARENESS: {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
            encoding.writeVarUint8Array(
              encoder,
              awarenessProtocol.encodeAwarenessUpdate(
                room.awareness,
                Array.from(room.awareness.getStates().keys())
              )
            );
            send(ws, encoding.toUint8Array(encoder));
            break;
          }
          default:
            console.warn(`[Yjs WS] Unhandled message type: ${messageType}`);
        }
      } catch (err) {
        console.error('[Yjs WS] Error processing client message:', err);
      }
    });

    // 4. Handle client disconnection
    ws.on('close', () => {
      room.clients.delete(ws);
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
