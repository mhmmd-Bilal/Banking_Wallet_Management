import { io } from "socket.io-client";

// Same-origin by default (proxied by Vite in development). The auth cookie is sent automatically.
// VITE_SOCKET_TRANSPORTS=polling is needed on Vercel (its rewrites cannot proxy WebSockets).
export function createSocket() {
  const transports = import.meta.env.VITE_SOCKET_TRANSPORTS;
  return io(import.meta.env.VITE_SOCKET_URL || undefined, {
    withCredentials: true,
    ...(transports && {
      transports: transports.split(",").map((t) => t.trim()),
    }),
  });
}
