import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

interface AuthSocket extends Socket {
  userId?: string;
  role?: string;
}

// Module-level io reference for emitting from services
let _io: Server | null = null;

export const getIO = (): Server | null => _io;

export const initSocket = (io: Server) => {
  _io = io;

  // Auth middleware — token from handshake auth or Authorization header
  io.use((socket: AuthSocket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.id;
      socket.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    logger.debug({ userId: socket.userId, role: socket.role }, 'Socket connected');

    // Join user's personal room
    if (socket.userId) socket.join(`user:${socket.userId}`);

    // ─── Order Events ────────────────────────────────────────────────────────
    // Client subscribes to a specific order (e.g. after placing order)
    socket.on('order:subscribe', (orderId: string) => {
      socket.join(`order:${orderId}`);
      logger.debug({ userId: socket.userId, orderId }, 'Subscribed to order');
    });

    socket.on('order:unsubscribe', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    // ─── DM / Chat Events ────────────────────────────────────────────────────
    // Join a conversation room for real-time messages
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Direct message (stored in DB via REST, but also pushed via socket)
    socket.on('dm:send', (data: { to_user_id: string; message: string; media_url?: string; conversation_id?: string }) => {
      // Push to recipient's personal room
      io.to(`user:${data.to_user_id}`).emit('dm:receive', {
        from_user_id: socket.userId,
        message: data.message,
        media_url: data.media_url,
        timestamp: new Date().toISOString(),
      });

      // Also push into conversation room if given
      if (data.conversation_id) {
        socket.to(`conv:${data.conversation_id}`).emit('dm:receive', {
          from_user_id: socket.userId,
          message: data.message,
          media_url: data.media_url,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('dm:typing', (data: { to_user_id: string; conversation_id?: string }) => {
      io.to(`user:${data.to_user_id}`).emit('dm:typing', { from_user_id: socket.userId });
      if (data.conversation_id) {
        socket.to(`conv:${data.conversation_id}`).emit('dm:typing', { from_user_id: socket.userId });
      }
    });

    socket.on('dm:read', (data: { conversation_id: string }) => {
      socket.to(`conv:${data.conversation_id}`).emit('dm:read', { user_id: socket.userId });
    });

    // ─── Notification Events ─────────────────────────────────────────────────
    socket.on('notification:read', (notificationId: string) => {
      // Acknowledge — the REST endpoint actually marks it read in DB
      socket.emit('notification:updated', { id: notificationId, is_read: true });
    });

    // ─── Online Status ────────────────────────────────────────────────────────
    socket.on('status:online', () => {
      socket.broadcast.emit('status:update', { user_id: socket.userId, online: true });
    });

    socket.on('disconnect', () => {
      logger.debug({ userId: socket.userId }, 'Socket disconnected');
      socket.broadcast.emit('status:update', { user_id: socket.userId, online: false });
    });
  });

  return io;
};

// ─── Helpers (call from services) ─────────────────────────────────────────────

export const emitToUser = (userId: string, event: string, data: unknown) => {
  if (_io) _io.to(`user:${userId}`).emit(event, data);
};

export const emitOrderUpdate = (orderId: string, data: { status: string; [key: string]: unknown }) => {
  if (_io) _io.to(`order:${orderId}`).emit('order:status', { order_id: orderId, ...data });
};

export const emitNotification = (userId: string, notification: { title: string; body: string; data?: unknown }) => {
  if (_io) _io.to(`user:${userId}`).emit('notification:new', notification);
};
