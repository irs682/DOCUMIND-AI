const AuditLog = require('../models/AuditLog');

const logAudit = async (req, action, targetType, targetId = '', metadata = {}) => {
  try {
    await AuditLog.create({ actor: req.user?._id || null, action, targetType, targetId: String(targetId), metadata, ip: req.ip || '' });
  } catch (error) {
    console.error('[Audit] Failed to write log:', error.message);
  }
};

module.exports = { logAudit };
