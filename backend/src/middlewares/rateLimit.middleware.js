// ---------------------------------------------------------------------------
// Generic in-memory IP rate limiter factory.
// Single-process only; resets on server restart.
// ---------------------------------------------------------------------------
function makeIpRateLimit({ limit, windowMs, message }) {
  const store = new Map(); // ip -> { count, resetAt }
  return function ipRateLimit(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    // Prune expired entries to avoid unbounded growth
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
    const entry = store.get(ip);
    if (entry) {
      if (entry.count >= limit) {
        res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return res.status(429).json({ success: false, message });
      }
      entry.count++;
    } else {
      store.set(ip, { count: 1, resetAt: now + windowMs });
    }
    return next();
  };
}

// ---------------------------------------------------------------------------
// Login: 10 lần / 15 phút / IP — chặn brute-force mật khẩu.
// Configurable via AUTH_LOGIN_RATE_LIMIT env var.
// ---------------------------------------------------------------------------
export const loginRateLimit = makeIpRateLimit({
  limit: Math.max(1, Number.parseInt(process.env.AUTH_LOGIN_RATE_LIMIT, 10) || 10),
  windowMs: 15 * 60 * 1000,
  message: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút.',
});

// ---------------------------------------------------------------------------
// Register: 5 lần / giờ / IP — chặn spam tạo tài khoản.
// Configurable via AUTH_REGISTER_RATE_LIMIT env var.
// ---------------------------------------------------------------------------
export const registerRateLimit = makeIpRateLimit({
  limit: Math.max(1, Number.parseInt(process.env.AUTH_REGISTER_RATE_LIMIT, 10) || 5),
  windowMs: 60 * 60 * 1000,
  message: 'Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 1 giờ.',
});

// ---------------------------------------------------------------------------
// Build PC POST: 60 lần / giờ / IP.
// Configurable via BUILD_SAVE_RATE_LIMIT_PER_HOUR env var.
// ---------------------------------------------------------------------------
export const buildPostRateLimit = makeIpRateLimit({
  limit: Math.max(1, Number.parseInt(process.env.BUILD_SAVE_RATE_LIMIT_PER_HOUR, 10) || 60),
  windowMs: 60 * 60 * 1000,
  message: 'Bạn đã tạo quá nhiều cấu hình trong 1 giờ. Vui lòng thử lại sau.',
});
