import { WebSocketMessage } from '../../shared/apiTypes';
import { getToken } from './utils';

function establishWebSocket(token: string) {
  if (!token) {
    return undefined;
  }
  const { protocol, hostname } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const WSS_URL = `${wsProtocol}//${hostname}:3001?token=${token}`;
  const socket = new WebSocket(WSS_URL);

  return socket;
}


class WSHandler {
  private socket: WebSocket | undefined;
  private handlers: Map<string, (data: unknown) => void> = new Map();

  public get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect(token: string): void {
    this.socket = establishWebSocket(token);
    if (!this.socket) {
      console.debug('No socket');
      return;
    }
    this.socket.addEventListener('message', (event: { data: string }) => {
      const { type, data } = JSON.parse(event.data) as WebSocketMessage;
      if (this.handlers.has(type)) {
        this.handlers.get(type)?.(data);
      }
    });
  }

  on(type: string, handler: (data: unknown) => void) {
    if (this.handlers.has(type)) {
      throw new Error(`Handler for ${type} already registered`);
    }
    this.handlers.set(type, handler);
  }

  off(type: string) {
    this.handlers.delete(type);
  }

  send(type: string, data: Record<string, unknown>): boolean {
    if (!this.socket) return false;
    try {
      this.socket.send(JSON.stringify({ type, data }));
    } catch (err) {
      console.debug('Failed to send message', err);
      return false;
    }
    return true;
  }
}

const wsHandler = new WSHandler();
let token: string | undefined;
try {
  token = getToken();
} catch (_err) { /* ignore */ }
if (token) {
  wsHandler.connect(token);
  console.debug('Connected to websocket');
} else {
  console.debug('No token found, not connecting to websocket');
}

function getGlobalWSHandler() {
  return wsHandler;
}

export {
  wsHandler,
  getGlobalWSHandler,
};