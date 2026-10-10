const express = require("express");

const {
    register,
    login,
    getMe,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    forgotPassword,
    resetPassword,
    logout,
} = require("../controllers/authController");
const { protect } = require('../middleware/authMiddleware');
const { avatarUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);
router.delete('/avatar', protect, removeAvatar);

module.exports = router;
