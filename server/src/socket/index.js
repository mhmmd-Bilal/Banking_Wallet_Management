import { Server } from 'socket.io';
import { parse } from 'cookie';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { COOKIE_NAME, verifyToken } from '../utils/token.js';

let io = null;

const room = (userId) => `user:${userId}`;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // Authenticate every connection using the same HTTP-only JWT cookie as the REST API.
  io.use(async (socket, next) => {
    try {
      const origin = socket.handshake.headers.origin;
      if (origin && origin !== env.clientUrl) return next(new Error('Origin not allowed'));
      const token = parse(socket.handshake.headers.cookie || '')[COOKIE_NAME];
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyToken(token);
      const user = await User.findById(payload.sub).select('_id role');
      if (!user) return next(new Error('Authentication required'));
      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      return next();
    } catch {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // The server alone decides the room, derived from the verified token.
    // There is deliberately no client-callable "join" event, so a user can never
    // subscribe to someone else's private room.
    socket.join(room(socket.data.userId));
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(room(userId)).emit(event, payload);
}

export async function closeSocket() {
  if (io) await io.close();
  io = null;
}
