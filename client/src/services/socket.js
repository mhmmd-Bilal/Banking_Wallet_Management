import { io } from 'socket.io-client';

// Same-origin by default (proxied by Vite in development). The auth cookie is sent automatically.
export function createSocket() {
  return io(import.meta.env.VITE_SOCKET_URL || undefined, { withCredentials: true });
}
