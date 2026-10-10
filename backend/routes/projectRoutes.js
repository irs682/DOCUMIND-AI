const express = require('express');
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  pinProject,
  archiveProject,
  linkProjectDocuments,
  removeProjectDocument,
  deleteProject,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.patch('/:id/pin', pinProject);
router.patch('/:id/archive', archiveProject);
router.post('/:id/documents', linkProjectDocuments);
router.delete('/:id/documents/:documentId', removeProjectDocument);
router.delete('/:id', deleteProject);

module.exports = router;
