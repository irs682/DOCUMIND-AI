const Project = require('../models/Project');
const Document = require('../models/Document');
const ChatSession = require('../models/ChatSession');
const mongoose = require('mongoose');

const withCounts = async (project) => {
  const docIds = Array.isArray(project.documentIds) ? project.documentIds : [];
  const [docCountByField, chatCount] = await Promise.all([
    Document.countDocuments({
      owner: project.owner,
      $or: [{ projectId: project._id }, { _id: { $in: docIds } }],
    }),
    ChatSession.countDocuments({ user: project.owner, projectId: project._id }),
  ]);
  const documentCount = Math.max(docCountByField, docIds.length);
  return { ...project.toObject(), documentCount, chatCount };
};

const createProject = async (req, res) => {
  const {
    name,
    description = '',
    instructions = '',
    color = '#4f46e5',
    icon = 'folder',
    documentIds = [],
  } = req.body;

  if (!String(name || '').trim()) return res.status(400).json({ message: 'Project name is required' });

  const validDocIds = Array.isArray(documentIds)
    ? documentIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

  const project = await Project.create({
    owner: req.user._id,
    name: String(name).trim(),
    description: String(description).trim(),
    instructions: String(instructions).trim(),
    color,
    icon,
    documentIds: validDocIds,
    lastActivityAt: new Date(),
  });

  // If initial documents passed, tag them
  if (validDocIds.length) {
    await Document.updateMany(
      { _id: { $in: validDocIds }, owner: req.user._id },
      { $set: { projectId: project._id } }
    );
  }

  return res.status(201).json({ project: await withCounts(project) });
};

const getProjects = async (req, res) => {
  const { status = 'active', search } = req.query;
  const filter = { owner: req.user._id };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: regex }, { description: regex }];
  }

  const projects = await Project.find(filter)
    .sort({ isPinned: -1, lastActivityAt: -1, updatedAt: -1 });

  return res.json({ projects: await Promise.all(projects.map(withCounts)) });
};

const getProject = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const [documents, conversations] = await Promise.all([
    Document.find({
      owner: req.user._id,
      $or: [{ projectId: project._id }, { _id: { $in: project.documentIds || [] } }],
    })
      .select('-chunks')
      .sort({ createdAt: -1 }),
    ChatSession.find({ user: req.user._id, projectId: project._id })
      .select('title model status isPinned lastMessagePreview lastMessageAt createdAt updatedAt')
      .sort({ isPinned: -1, lastMessageAt: -1, updatedAt: -1 }),
  ]);

  return res.json({
    project: await withCounts(project),
    documents,
    conversations,
  });
};

const updateProject = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const updates = {};
  ['name', 'description', 'instructions', 'color', 'icon', 'status', 'isPinned'].forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (updates.name !== undefined && !String(updates.name).trim()) {
    return res.status(400).json({ message: 'Project name cannot be empty' });
  }

  if (Array.isArray(req.body.documentIds)) {
    updates.documentIds = req.body.documentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  }

  updates.lastActivityAt = new Date();

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  if (!project) return res.status(404).json({ message: 'Project not found' });
  return res.json({ project: await withCounts(project) });
};

const pinProject = async (req, res) => {
  const { isPinned } = req.body;
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { isPinned: typeof isPinned === 'boolean' ? isPinned : true, lastActivityAt: new Date() },
    { new: true }
  );
  if (!project) return res.status(404).json({ message: 'Project not found' });
  return res.json({ project: await withCounts(project) });
};

const archiveProject = async (req, res) => {
  const { status } = req.body;
  const targetStatus = status === 'active' ? 'active' : 'archived';
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { status: targetStatus, lastActivityAt: new Date() },
    { new: true }
  );
  if (!project) return res.status(404).json({ message: 'Project not found' });
  return res.json({ project: await withCounts(project) });
};

const linkProjectDocuments = async (req, res) => {
  const { documentIds = [] } = req.body;
  const validIds = documentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) return res.status(404).json({ message: 'Project not found' });

  await Document.updateMany(
    { _id: { $in: validIds }, owner: req.user._id },
    { $set: { projectId: project._id } }
  );

  project.documentIds = Array.from(new Set([...(project.documentIds || []).map(String), ...validIds]));
  project.lastActivityAt = new Date();
  await project.save();

  return res.json({ project: await withCounts(project) });
};

const removeProjectDocument = async (req, res) => {
  const { documentId } = req.params;
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) return res.status(404).json({ message: 'Project not found' });

  project.documentIds = (project.documentIds || []).filter((id) => id.toString() !== documentId);
  project.lastActivityAt = new Date();
  await project.save();

  await Document.updateOne(
    { _id: documentId, owner: req.user._id, projectId: project._id },
    { $set: { projectId: null } }
  );

  return res.json({ message: 'Document removed from project', project: await withCounts(project) });
};

const deleteProject = async (req, res) => {
  const { deleteChats = false } = req.body;
  const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!project) return res.status(404).json({ message: 'Project not found' });

  // Detach documents from project without deleting the files
  await Document.updateMany({ owner: req.user._id, projectId: project._id }, { $set: { projectId: null } });

  if (deleteChats) {
    await ChatSession.deleteMany({ user: req.user._id, projectId: project._id });
  } else {
    // Preserve chats by releasing them to standalone history
    await ChatSession.updateMany({ user: req.user._id, projectId: project._id }, { $set: { projectId: null } });
  }

  return res.json({ message: 'Project deleted successfully' });
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  pinProject,
  archiveProject,
  linkProjectDocuments,
  removeProjectDocument,
  deleteProject,
};

