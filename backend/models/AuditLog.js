const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String, default: '' },
  targetId: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  performedByName: { type: String, default: '' },
  targetResource: { type: String, default: '' },
  details: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  status: { type: String, default: 'success' },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
