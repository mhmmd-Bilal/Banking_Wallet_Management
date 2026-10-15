import { Notification } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export async function listNotifications(userId, { page, limit }) {
  const [items, total, unread] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { items, unread, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export const unreadCount = (userId) => Notification.countDocuments({ userId, read: false });

export async function markRead(userId, id) {
  const n = await Notification.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true });
  if (!n) throw new ApiError(404, 'Notification not found');
  return n;
}
