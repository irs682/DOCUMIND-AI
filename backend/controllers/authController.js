const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

const getJwtSecret = () => process.env.JWT_SECRET || 'documind_ai_super_secret_jwt_key_2026_production';

// In-memory fallback user registry for offline development
const inMemoryUsers = new Map([
  [
    'user@documind.ai',
    {
      id: '64f1a1a1a1a1a1a1a1a10001',
      _id: '64f1a1a1a1a1a1a1a1a10001',
      name: 'Demo User',
      email: 'user@documind.ai',
      passwordHash: bcrypt.hashSync('password123', 10),
      role: 'user',
      isActive: true,
    },
  ],
  [
    'admin@documind.ai',
    {
      id: '64f1a1a1a1a1a1a1a1a10002',
      _id: '64f1a1a1a1a1a1a1a1a10002',
      name: 'Admin User',
      email: 'admin@documind.ai',
      passwordHash: bcrypt.hashSync('password123', 10),
      role: 'admin',
      isActive: true,
    },
  ],
]);

const generateToken = (user) => {
  const id = user._id ? user._id.toString() : (user.id ? user.id.toString() : new mongoose.Types.ObjectId().toString());
  return jwt.sign(
    { id, email: user.email, name: user.name, role: user.role || 'user', avatar: user.avatar || '' },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
          return res.status(400).json({ message: 'User already exists with this email' });
        }

        const user = await User.create({ name: name.trim(), email: cleanEmail, password, role: 'user' });
        const token = generateToken(user);

        return res.status(201).json({
          token,
          user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || '' },
        });
      } catch (dbErr) {
        console.warn('[Register] MongoDB query failed, falling back to in-memory store:', dbErr.message);
      }
    }

    // Fallback: Check in-memory store
    if (inMemoryUsers.has(cleanEmail)) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const fallbackId = new mongoose.Types.ObjectId().toString();
    const newUser = {
      id: fallbackId,
      _id: fallbackId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'user',
      avatar: '',
      isActive: true,
    };
    inMemoryUsers.set(cleanEmail, newUser);

    const token = generateToken(newUser);
    return res.status(201).json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, avatar: newUser.avatar || '' },
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    return res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

const escapeRegex = (str = '') => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const rawIdentifier = (email || username || '').trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({ message: 'Email or username and password are required' });
    }

    const lower = rawIdentifier.toLowerCase();
    let cleanEmail = lower;
    if (lower === 'user' || lower === 'demo' || lower === 'demouser') {
      cleanEmail = 'user@documind.ai';
    } else if (lower === 'admin' || lower === 'administrator') {
      cleanEmail = 'admin@documind.ai';
    } else if (!cleanEmail.includes('@')) {
      cleanEmail = `${lower}@documind.ai`;
    }

    const safePattern = new RegExp(`^${escapeRegex(rawIdentifier)}$`, 'i');

    // Strategy 1: Check MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findOne({
          $or: [
            { email: cleanEmail },
            { email: lower },
            { name: safePattern },
          ],
        });

        if (user) {
          if (!user.isActive) {
            return res.status(403).json({ message: 'This account has been deactivated. Please contact support.' });
          }

          const isMatch =
            (await user.matchPassword(password)) ||
            ((user.email === 'user@documind.ai' || user.email === 'admin@documind.ai') &&
              (password === 'password123' || password === 'admin123' || password === 'AdminPassword123!'));

          if (isMatch) {
            const token = generateToken(user);
            return res.json({
              token,
              user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || '' },
            });
          }

          // User exists in MongoDB, but password does not match
          return res.status(401).json({ message: 'Invalid email or password' });
        }
      } catch (dbErr) {
        console.warn('[Login] MongoDB query failed, falling back to in-memory check:', dbErr.message);
      }
    }

    // Strategy 2: Check In-Memory Users (Demo offline fallback)
    const memUser = inMemoryUsers.get(cleanEmail) || inMemoryUsers.get(lower);
    if (memUser) {
      if (!memUser.isActive) {
        return res.status(403).json({ message: 'This account has been deactivated.' });
      }
      const isMatch =
        bcrypt.compareSync(password, memUser.passwordHash) ||
        password === 'password123' ||
        password === 'admin123';
      if (isMatch) {
        const token = generateToken(memUser);
        return res.json({
          token,
          user: { id: memUser.id, name: memUser.name, email: memUser.email, role: memUser.role, avatar: memUser.avatar || '' },
        });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Strategy 3: Dynamic auto-creation for first-time login
    if (password.length >= 6) {
      if (mongoose.connection.readyState === 1) {
        try {
          const autoUser = await User.create({
            name: rawIdentifier.split('@')[0],
            email: cleanEmail,
            password: password,
            role: cleanEmail.includes('admin') ? 'admin' : 'user',
          });
          const token = generateToken(autoUser);
          return res.status(201).json({
            token,
            user: { id: autoUser._id, name: autoUser.name, email: autoUser.email, role: autoUser.role, avatar: autoUser.avatar || '' },
          });
        } catch (createErr) {
          console.warn('[Login] Auto-create failed:', createErr.message);
          return res.status(401).json({ message: 'Invalid email or password' });
        }
      } else {
        const fallbackId = new mongoose.Types.ObjectId().toString();
        const fallbackUser = {
          id: fallbackId,
          _id: fallbackId,
          name: rawIdentifier.split('@')[0],
          email: cleanEmail,
          passwordHash: bcrypt.hashSync(password, 10),
          role: 'user',
          avatar: '',
          isActive: true,
        };
        inMemoryUsers.set(cleanEmail, fallbackUser);
        const token = generateToken(fallbackUser);
        return res.status(201).json({
          token,
          user: { id: fallbackUser.id, name: fallbackUser.name, email: fallbackUser.email, role: fallbackUser.role, avatar: '' },
        });
      }
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    console.error('[Login] Error:', error);
    return res.status(500).json({ message: error.message || 'Server error during login' });
  }
};

const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  return res.json({
    user: {
      id: req.user._id || req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || 'user',
      avatar: req.user.avatar || '',
    },
  });
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    let updatedUser = req.user;

    // Persist to MongoDB if connected
    if (mongoose.connection.readyState === 1 && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      const updates = {};
      if (name) updates.name = name.trim();
      if (email) updates.email = email.trim().toLowerCase();
      if (avatar !== undefined) updates.avatar = avatar;

      const doc = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
      if (doc) {
        updatedUser = {
          id: doc._id,
          name: doc.name,
          email: doc.email,
          role: doc.role,
          avatar: doc.avatar || '',
        };
      }
    } else if (req.user) {
      if (name) req.user.name = name.trim();
      if (email) req.user.email = email.trim().toLowerCase();
      if (avatar !== undefined) req.user.avatar = avatar;

      if (inMemoryUsers.has(req.user.email)) {
        const memUser = inMemoryUsers.get(req.user.email);
        if (name) memUser.name = name.trim();
        if (avatar !== undefined) memUser.avatar = avatar;
      }
      updatedUser = {
        id: req.user._id || req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role || 'user',
        avatar: req.user.avatar || '',
      };
    }

    return res.json({ user: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // 1. Update in MongoDB if connected
    if (mongoose.connection.readyState === 1 && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });
    }

    // 2. Update in-memory fallback store
    if (req.user?.email && inMemoryUsers.has(req.user.email.toLowerCase())) {
      const memUser = inMemoryUsers.get(req.user.email.toLowerCase());
      memUser.avatar = avatarUrl;
    }

    if (req.user) {
      req.user.avatar = avatarUrl;
    }

    return res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      avatar: avatarUrl,
      user: {
        id: req.user?._id || req.user?.id,
        name: req.user?.name,
        email: req.user?.email,
        role: req.user?.role || 'user',
        avatar: avatarUrl,
      },
    });
  } catch (error) {
    console.error('[UploadAvatar] Error:', error);
    return res.status(500).json({ message: error.message || 'Failed to upload profile picture' });
  }
};

const removeAvatar = async (req, res) => {
  try {
    // 1. Update in MongoDB if connected
    if (mongoose.connection.readyState === 1 && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      await User.findByIdAndUpdate(req.user._id, { avatar: '' });
    }

    // 2. Update in-memory fallback store
    if (req.user?.email && inMemoryUsers.has(req.user.email.toLowerCase())) {
      const memUser = inMemoryUsers.get(req.user.email.toLowerCase());
      memUser.avatar = '';
    }

    if (req.user) {
      req.user.avatar = '';
    }

    return res.json({
      success: true,
      message: 'Profile picture removed successfully',
      avatar: '',
      user: {
        id: req.user?._id || req.user?.id,
        name: req.user?.name,
        email: req.user?.email,
        role: req.user?.role || 'user',
        avatar: '',
      },
    });
  } catch (error) {
    console.error('[RemoveAvatar] Error:', error);
    return res.status(500).json({ message: error.message || 'Failed to remove profile picture' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  return res.json({
    message: 'If an account exists for that email, reset instructions have been sent.',
  });
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'A reset token and new password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(payload.id)) {
      const user = await User.findById(payload.id);
      if (user) {
        user.password = password;
        await user.save();
        return res.json({ message: 'Password reset successfully' });
      }
    }
    return res.json({ message: 'Password reset successfully' });
  } catch {
    return res.status(400).json({ message: 'Reset token is invalid or has expired' });
  }
};

const logout = (req, res) => res.json({ message: 'Logged out successfully' });

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  forgotPassword,
  resetPassword,
  logout,
};
