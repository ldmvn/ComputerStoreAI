// In-memory rate limit for POST /builds.
// Configurable via BUILD_SAVE_RATE_LIMIT_PER_HOUR env var (default 60).
// Single-process only; resets on server restart.
const LIMIT = Math.max(1, Number.parseInt(process.env.BUILD_SAVE_RATE_LIMIT_PER_HOUR, 10) || 60);
const buildPostStore = new Map(); // ip -> { count, resetAt }

export function buildPostRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = buildPostStore.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= LIMIT) {
      return res.status(429).json({
        message: 'Bạn đã tạo quá nhiều cấu hình trong 1 giờ. Vui lòng thử lại sau.',
      });
    }
    entry.count++;
  } else {
    buildPostStore.set(ip, { count: 1, resetAt: now + 3_600_000 });
  }
  return next();
}
