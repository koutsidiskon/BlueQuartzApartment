import jwt from 'jsonwebtoken';

const AUTH_COOKIE_NAME = process.env.ADMIN_AUTH_COOKIE_NAME || 'bq_admin_token';

function extractBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

export function requireAdminAuth(req, res, next) {
  const jwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      success: false,
      message: 'Server auth is not configured.'
    });
  }

  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] || null;
  const bearerToken = extractBearerToken(req.headers.authorization);
  const token = cookieToken || bearerToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.adminAuth = {
      userId: Number(decoded.sub),
      email: decoded.email,
      role: decoded.role
    };
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session.'
    });
  }
}

export function requireAdminRole(...roles) {
  return (req, res, next) => {
    const role = req.adminAuth?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions.'
      });
    }

    return next();
  };
}
