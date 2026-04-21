import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminUser } from '../models/AdminUser.js';

const AUTH_COOKIE_NAME = process.env.ADMIN_AUTH_COOKIE_NAME || 'bq_admin_token';
const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function shouldUseSecureCookie(req) {
  const envValue = String(process.env.ADMIN_AUTH_COOKIE_SECURE || '').trim().toLowerCase();

  if (envValue === 'true') return true;
  if (envValue === 'false') return false;

  const forwardedProtoHeader = req?.headers?.['x-forwarded-proto'];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? String(forwardedProtoHeader[0] || '').trim().toLowerCase()
    : String(forwardedProtoHeader || '').split(',')[0].trim().toLowerCase();

  return !!req?.secure || forwardedProto === 'https';
}

function getCookieOptions(req) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookie(req),
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS * 1000
  };
}

function signToken(user) {
  const jwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('Missing ADMIN_JWT_SECRET');
  }

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    jwtSecret,
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt
  };
}

export class AdminAuthController {
  async login(req, res) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required.'
        });
      }

      const user = await AdminUser.findOne({ where: { email } });
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.'
        });
      }

      const token = signToken(user);
      user.lastLoginAt = new Date();
      await user.save();

      res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions(req));
      return res.json({
        success: true,
        data: toSafeUser(user)
      });
    } catch (error) {
      console.error('Admin login failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed.'
      });
    }
  }

  async me(req, res) {
    try {
      const userId = req.adminAuth?.userId;
      const user = await AdminUser.findByPk(userId);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Session is not valid.'
        });
      }

      return res.json({
        success: true,
        data: toSafeUser(user)
      });
    } catch (error) {
      console.error('Admin me failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Could not fetch current user.'
      });
    }
  }

  async logout(req, res) {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: shouldUseSecureCookie(req),
      sameSite: 'lax',
      path: '/'
    });

    return res.json({ success: true });
  }
}

export const adminAuthController = new AdminAuthController();
