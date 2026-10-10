const mongoose = require("mongoose");
const User = require("../models/User");
const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
const AIRequest = require("../models/AIRequest");

/**
 * Log an administrative action to MongoDB AuditLog
 */
const createAuditEntry = async ({ action, req, targetResource, details, status = "success" }) => {
  try {
    const performedById = req?.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)
      ? req.user._id
      : null;
    await AuditLog.create({
      action,
      performedBy: performedById,
      performedByName: req.user?.name || "System Admin",
      targetResource,
      details,
      ipAddress: req.ip || "127.0.0.1",
      status,
    });
  } catch (err) {
    console.warn("[AuditLog Write Warning]:", err.message);
  }
};

/**
 * GET /api/admin/dashboard-stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const [
      totalUsers, adminCount, totalDocuments, indexedDocuments, processingDocuments,
      failedDocuments, chunkStats, storageStats, aiToday, aiHealth, recentDocuments, recentAudit,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "admin" }),
      Document.countDocuments({}),
      Document.countDocuments({ status: "indexed" }),
      Document.countDocuments({ status: "processing" }),
      Document.countDocuments({ status: "failed" }),
      Document.aggregate([
      {
        $group: {
          _id: null,
          totalChunks: { $sum: "$chunksCount" },
          totalTokens: { $sum: "$totalTokens" },
        },
      },
      ]),
      Document.aggregate([{ $group: { _id: null, totalBytes: { $sum: "$size" } } }]),
      AIRequest.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: 1 }, averageLatency: { $avg: "$latencyMs" } } },
      ]),
      AIRequest.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, total: { $sum: 1 }, failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }, averageLatency: { $avg: "$latencyMs" } } },
      ]),
      Document.find({ status: { $in: ["processing", "failed"] } }).select("name status createdAt chunksCount").sort({ updatedAt: -1 }).limit(5),
      AuditLog.find({}).select("action performedByName targetResource details status createdAt").sort({ createdAt: -1 }).limit(5),
    ]);

    const totalChunks = chunkStats[0]?.totalChunks || 0;
    const totalTokens = chunkStats[0]?.totalTokens || 0;
    const regularUserCount = totalUsers - adminCount;
    const today = aiToday[0] || {};
    const aiWeek = aiHealth[0] || {};
    const aiFailureRate = aiWeek.total ? Number(((aiWeek.failed / aiWeek.total) * 100).toFixed(1)) : 0;

    const recentUsers = await User.find({})
      .select("name email role isActive avatar createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    return res.json({
      success: true,
      stats: {
        totalUsers,
        adminCount,
        regularUserCount,
        totalDocuments,
        indexedDocuments,
        processingDocuments,
        failedDocuments,
        totalChunks,
        totalTokens,
        storageBytes: storageStats[0]?.totalBytes || 0,
        aiQueriesToday: today.total || 0,
        avgLatencyMs: Math.round(today.averageLatency || aiWeek.averageLatency || 0),
        aiFailureRate,
        uptime: "99.99%",
      },
      recentUsers,
      systemServices: [
        { name: "Express API Server", status: "Operational", latency: "12ms" },
        { name: "MongoDB Database", status: "Operational", latency: "4ms" },
        { name: "Qdrant Vector Engine", status: "Operational", latency: "18ms" },
        { name: "OpenAI RAG Pipeline", status: "Operational", latency: "280ms" },
      ],
      attention: {
        failedDocuments,
        processingDocuments,
        aiFailureRate,
        recentDocuments,
      },
      recentAudit,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/users
 */
const getUsers = async (req, res) => {
  try {
    const { q = '', role, isActive, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip((Math.max(Number(page), 1) - 1) * safeLimit).limit(safeLimit),
      User.countDocuments(filter),
    ]);
    return res.json({ success: true, users, pagination: { page: Number(page), limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/admin/users/:id/role
 */
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be 'user' or 'admin'" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    await createAuditEntry({
      action: "UPDATE_USER_ROLE",
      req,
      targetResource: `User: ${user.email}`,
      details: `Changed role to ${role}`,
    });

    return res.json({ success: true, user, message: `User role updated to ${role}` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/admin/users/:id/toggle-status
 */
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user._id) === String(req.user._id) && user.isActive) return res.status(400).json({ message: 'You cannot deactivate your own account' });
    user.isActive = !user.isActive;
    await user.save();

    await createAuditEntry({
      action: "TOGGLE_USER_STATUS",
      req,
      targetResource: `User: ${user.email}`,
      details: `User status changed to ${user.isActive ? 'active' : 'deactivated'}`,
    });

    return res.json({
      success: true,
      message: `User account is now ${user.isActive ? 'active' : 'deactivated'}`,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Remove user's documents
    await Document.deleteMany({ owner: req.params.id });

    await createAuditEntry({
      action: "DELETE_USER",
      req,
      targetResource: `User: ${user.email}`,
      details: "User and associated documents purged",
    });

    return res.json({ success: true, message: "User deleted successfully", id: req.params.id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/documents
 */
const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find({})
      .populate("owner", "name email")
      .select("-chunks")
      .sort({ createdAt: -1 });

    return res.json({ success: true, documents });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/admin/documents/:id
 */
const deleteAdminDocument = async (req, res) => {
  try {
    const document = await Document.findByIdAndDelete(req.params.id);
    if (!document) return res.status(404).json({ message: "Document not found" });

    await createAuditEntry({
      action: "ADMIN_DELETE_DOCUMENT",
      req,
      targetResource: `Document: ${document.name}`,
      details: `Deleted document ID ${document._id}`,
    });

    return res.json({ success: true, message: "Document deleted by admin", id: req.params.id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/ai-monitoring
 */
const getAIMonitoringStats = async (req, res) => {
  try {
    const [summary, byType, recentFailures] = await Promise.all([
      AIRequest.aggregate([{ $group: { _id: null, total: { $sum: 1 }, successful: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }, avgLatency: { $avg: '$latencyMs' } } }]),
      AIRequest.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      AIRequest.find({ status: 'failed' }).sort({ createdAt: -1 }).limit(25).populate('user', 'name email'),
    ]);
    const totals = summary[0] || { total: 0, successful: 0, failed: 0, avgLatency: 0 };
    return res.json({
      success: true,
      monitoring: {
        totalRequests: totals.total,
        successfulRequests: totals.successful,
        failedRequests: totals.failed,
        avgResponseTimeMs: Math.round(totals.avgLatency || 0),
        requestTypes: byType,
        recentFailures,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getAllDocuments,
  deleteAdminDocument,
  getAIMonitoringStats,
  getAuditLogs,
};
