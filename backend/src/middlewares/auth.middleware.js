import { verifyAccessToken } from '../services/token.service.js';

// Optional auth — attaches req.user if a valid Bearer token is present, but never rejects.
export function optionalAuth(req, _res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme === 'Bearer' && token) {
    try { req.user = verifyAccessToken(token); } catch { /* ignore */ }
  }
  return next();
}

export function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
}
