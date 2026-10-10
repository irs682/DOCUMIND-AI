const Organization = require('../models/Organization');
const User = require('../models/User');
const Document = require('../models/Document');
const KnowledgeBase = require('../models/KnowledgeBase');

// @desc    Get user's current organization workspace
// @route   GET /api/organizations/current
// @access  Private
const getCurrentOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.organizationId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar role');

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(org);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all organizations user belongs to
// @route   GET /api/organizations
// @access  Private
const getUserOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    }).select('name slug plan quotas createdAt');

    res.json(orgs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private
const createOrganization = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now().toString(36)}`;

    const org = await Organization.create({
      name: name.trim(),
      slug,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'org_admin' }],
      plan: 'free',
    });

    req.user.organizationId = org._id;
    await req.user.save();

    res.status(201).json(org);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add / invite member to current organization
// @route   POST /api/organizations/members
// @access  Private (org_admin / manager)
const addMember = async (req, res) => {
  try {
    const { email, role = 'user' } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'User email is required' });
    }

    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const existingMember = org.members.find(
      (m) => m.user.toString() === targetUser._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this organization' });
    }

    if (org.members.length >= (org.quotas?.maxTeamMembers || 10)) {
      return res.status(403).json({ message: 'Organization member limit reached for current plan' });
    }

    org.members.push({ user: targetUser._id, role });
    await org.save();

    if (!targetUser.organizationId) {
      targetUser.organizationId = org._id;
      await targetUser.save();
    }

    res.json({ message: 'Member added successfully', organization: org });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get organization usage metrics & quota stats
// @route   GET /api/organizations/usage
// @access  Private
const getUsageMetrics = async (req, res) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const docFilter = { $or: [{ organizationId: org._id }, { owner: req.user._id }] };
    const docs = await Document.find(docFilter).select('size chunksCount');

    const totalDocs = docs.length;
    const totalStorageBytes = docs.reduce((acc, d) => acc + (d.size || 0), 0);
    const totalChunks = docs.reduce((acc, d) => acc + (d.chunksCount || 0), 0);

    const totalKbs = await KnowledgeBase.countDocuments({
      $or: [{ organizationId: org._id }, { owner: req.user._id }],
    });

    res.json({
      organization: {
        id: org._id,
        name: org.name,
        plan: org.plan,
      },
      quotas: org.quotas,
      usage: {
        documentsCount: totalDocs,
        documentsLimit: org.quotas.maxDocuments,
        documentsPercent: Math.min(100, Math.round((totalDocs / org.quotas.maxDocuments) * 100)),
        storageBytes: totalStorageBytes,
        storageLimit: org.quotas.maxStorageBytes,
        storagePercent: Math.min(100, Math.round((totalStorageBytes / org.quotas.maxStorageBytes) * 100)),
        tokensUsed: org.quotas.monthlyTokensUsed || 0,
        tokensLimit: org.quotas.maxAiTokensPerMonth,
        tokensPercent: Math.min(100, Math.round(((org.quotas.monthlyTokensUsed || 0) / org.quotas.maxAiTokensPerMonth) * 100)),
        knowledgeBasesCount: totalKbs,
        chunksIndexed: totalChunks,
        teamMembersCount: org.members.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCurrentOrganization,
  getUserOrganizations,
  createOrganization,
  addMember,
  getUsageMetrics,
};
