export function sendSuccess(res, message, data = {}, status = 200) {
  return res.status(status).json({ success: true, message, data });
}
