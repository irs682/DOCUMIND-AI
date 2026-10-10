const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'documind_ai_super_secret_jwt_key_2026_production';
      const decoded = jwt.verify(token, secret);

      if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.id)) {
        req.user = await User.findById(decoded.id).select('-password');
      }

      if (!req.user) {
        req.user = {
          _id: decoded.id,
          id: decoded.id,
          name: decoded.name || 'User',
          email: decoded.email,
          role: decoded.role || 'user',
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

module.exports = { protect, adminOnly };
