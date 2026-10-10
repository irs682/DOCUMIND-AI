const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const userId = req.user?._id?.toString() || req.user?.id?.toString() || 'anonymous';
    const userDir = path.join(__dirname, '../uploads/users', userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.csv', '.txt', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    const err = new Error(`Unsupported file format '${ext}'. Allowed: PDF, DOCX, CSV, TXT, JSON.`);
    err.status = 400;
    cb(err);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
});

// Ensure uploads/avatars folder exists
const avatarUploadDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, avatarUploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user?._id || req.user?.id || 'usr'}-${uniqueSuffix}${ext}`);
  },
});

const avatarFileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    const err = new Error(`Unsupported image format '${ext}'. Allowed formats: JPG, PNG, WEBP, GIF.`);
    err.status = 400;
    cb(err);
  }
};

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max limit
});

upload.avatarUpload = avatarUpload;
module.exports = upload;
module.exports.upload = upload;
module.exports.avatarUpload = avatarUpload;
