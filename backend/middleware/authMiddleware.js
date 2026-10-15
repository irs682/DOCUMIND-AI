const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');

const deriveObjectId = (seedString) => {
  if (seedString && mongoose.Types.ObjectId.isValid(seedString)) {
    return new mongoose.Types.ObjectId(seedString);
  }
  const seed = String(seedString || 'fallback-user-seed');
  const hex24 = crypto.createHash('md5').update(seed).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hex24);
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'documind_ai_super_secret_jwt_key_2026_production';
      const decoded = jwt.verify(token, secret);

      let user = null;

      // 1. If MongoDB is connected, attempt to find or associate real MongoDB user
      if (mongoose.connection.readyState === 1) {
        if (decoded.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
          user = await User.findById(decoded.id).select('-password');
        }

        if (!user && decoded.email) {
          const cleanEmail = decoded.email.trim().toLowerCase();
          user = await User.findOne({ email: cleanEmail }).select('-password');

          // If user exists in in-memory or token but not in MongoDB, persist user in MongoDB
          if (!user) {
            try {
              const createdUser = await User.create({
                name: decoded.name || cleanEmail.split('@')[0],
                email: cleanEmail,
                password: 'fallback_autocreated_password_hash',
                role: decoded.role || 'user',
                avatar: decoded.avatar || '',
              });
              user = createdUser;
            } catch (createErr) {
              user = await User.findOne({ email: cleanEmail }).select('-password');
            }
          }
        }
      }

      if (user) {
        req.user = user;
      } else {
        const validId = deriveObjectId(decoded.id || decoded.email);
        req.user = {
          _id: validId,
          id: validId.toString(),
          name: decoded.name || 'User',
          email: decoded.email || 'user@documind.ai',
          role: decoded.role || 'user',
          avatar: decoded.avatar || '',
          isActive: true,
        };
      }

      if (!req.user || req.user.isActive === false) {
        return res.status(401).json({ message: 'Account is unavailable' });
      }

      req.organizationId = req.user.organizationId || null;

      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, token is required' });
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
};

module.exports = { protect, adminOnly, deriveObjectId };

