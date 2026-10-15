import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as service from '../services/notificationService.js';

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Notifications', await service.listNotifications(req.user._id, req.query));
});

export const unread = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Unread notifications', { count: await service.unreadCount(req.user._id) });
});

export const read = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Notification marked as read', { notification: await service.markRead(req.user._id, req.params.id) });
});
