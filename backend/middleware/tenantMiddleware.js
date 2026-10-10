const Organization = require('../models/Organization');

/**
 * Ensures user has an associated organization.
 * Auto-creates a default personal organization workspace for the user if they don't have one.
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    let org = null;
    if (req.user.organizationId) {
      org = await Organization.findById(req.user.organizationId);
    }

    if (!org) {
      // Find organization where user is owner or member
      org = await Organization.findOne({
        $or: [
          { owner: req.user._id },
          { 'members.user': req.user._id }
        ]
      });
    }

    if (!org) {
      // Auto-provision personal workspace organization for user
      const slug = `org-${req.user._id.toString().slice(-6)}-${Date.now().toString(36)}`;
      org = await Organization.create({
        name: `${req.user.name}'s Workspace`,
        slug,
        owner: req.user._id,
        members: [{ user: req.user._id, role: 'org_admin' }],
        plan: 'free',
      });

      req.user.organizationId = org._id;
      await req.user.save().catch(() => {});
    }

    req.organizationId = org._id;
    req.organization = org;
    next();
  } catch (err) {
    console.error('[Tenant Middleware] Error resolving organization:', err);
    next();
  }
};

/**
 * Role-Based Access Control (RBAC) middleware.
 * Accepts allowed roles and ensures req.user has appropriate permission.
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Superadmin bypasses all role restrictions
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Check organization-level role if inside an organization
    let userRole = req.user.role;
    if (req.organization && req.organization.members) {
      const member = req.organization.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );
      if (member) {
        userRole = member.role;
      }
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
      currentRole: userRole,
    });
  };
};

module.exports = {
  tenantMiddleware,
  requireRole,
};
