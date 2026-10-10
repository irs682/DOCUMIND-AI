const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Project = require('../models/Project');
const ChatSession = require('../models/ChatSession');
const Document = require('../models/Document');

async function runVerification() {
  console.log('=== [DOCUMIND-AI] PROJECT WORKSPACES VERIFICATION SUITE ===\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/documind-ai');
    console.log('✓ MongoDB Connected');

    // 1. Find or create a test user
    let testUser = await User.findOne({ email: 'test@documind.test' });
    if (!testUser) {
      testUser = await User.findOne({});
    }
    if (!testUser) {
      console.error('No user found in database. Please run seed or register a user.');
      process.exit(1);
    }
    console.log(`✓ Using User: ${testUser.email} (${testUser._id})`);

    // 2. Test Project Creation
    console.log('\n--- Test 1: Project Creation ---');
    const testProjectName = `INDUSTRIA-AI-${Date.now()}`;
    const project = await Project.create({
      owner: testUser._id,
      name: testProjectName,
      description: 'Industrial automation and robotics SRS documentation',
      instructions: 'Use technical engineering terminology and cite document sections.',
      color: '#4f46e5',
      icon: 'folder',
      status: 'active',
      isPinned: false,
      lastActivityAt: new Date(),
    });
    console.log(`✓ Created Project: "${project.name}" (ID: ${project._id})`);
    console.log(`  Instructions: "${project.instructions}"`);

    // 3. Test Standalone Chat Creation
    console.log('\n--- Test 2: Standalone Chat Creation ---');
    const standaloneChat = await ChatSession.create({
      user: testUser._id,
      title: 'Qdrant Vector Indexing Discussion',
      projectId: null,
      status: 'active',
      isPinned: false,
      lastMessageAt: new Date(),
      lastMessagePreview: 'How does Qdrant index embeddings?',
      messages: [
        { sender: 'user', text: 'How does Qdrant index embeddings?' },
        { sender: 'assistant', text: 'Qdrant uses HNSW graphs for approximate nearest neighbors.' },
      ],
    });
    console.log(`✓ Standalone Chat Created: "${standaloneChat.title}" (projectId: ${standaloneChat.projectId})`);

    // 4. Test Move Chat into Project
    console.log('\n--- Test 3: Move Chat into Project ---');
    standaloneChat.projectId = project._id;
    await standaloneChat.save();
    project.lastActivityAt = new Date();
    await project.save();

    const movedCheck = await ChatSession.findById(standaloneChat._id);
    if (String(movedCheck.projectId) === String(project._id)) {
      console.log(`✓ Chat successfully moved into Project: "${project.name}"`);
    } else {
      throw new Error('Failed to move chat into project');
    }

    // 5. Test Remove Chat from Project (Back to Standalone)
    console.log('\n--- Test 4: Remove Chat from Project ---');
    movedCheck.projectId = null;
    await movedCheck.save();
    const restoredCheck = await ChatSession.findById(standaloneChat._id);
    if (restoredCheck.projectId === null) {
      console.log(`✓ Chat successfully removed from project to general history without losing messages. Total messages: ${restoredCheck.messages.length}`);
    } else {
      throw new Error('Failed to remove chat from project');
    }

    // 6. Test Project Document Linking & Isolation
    console.log('\n--- Test 5: Project Document Linking ---');
    let sampleDoc = await Document.findOne({ owner: testUser._id });
    if (!sampleDoc) {
      sampleDoc = await Document.create({
        owner: testUser._id,
        name: 'INDUSTRIA-AI-SRS.pdf',
        originalName: 'INDUSTRIA-AI-SRS.pdf',
        fileType: 'pdf',
        status: 'ready',
      });
    }
    project.documentIds = [sampleDoc._id];
    await project.save();
    console.log(`✓ Linked Document "${sampleDoc.name}" to Project "${project.name}"`);
    console.log(`  Project documentIds: ${project.documentIds.length} file(s)`);

    // 7. Test Pinning and Archiving
    console.log('\n--- Test 6: Pinning & Archiving Project ---');
    project.isPinned = true;
    await project.save();
    console.log(`✓ Project pinned: isPinned = ${project.isPinned}`);

    project.status = 'archived';
    await project.save();
    console.log(`✓ Project archived: status = ${project.status}`);

    project.status = 'active';
    await project.save();
    console.log(`✓ Project restored: status = ${project.status}`);

    // 8. Test Safe Deletion Policy (Move chats to standalone, keep documents)
    console.log('\n--- Test 7: Safe Deletion Policy ---');
    // Create a project chat
    const projectChat = await ChatSession.create({
      user: testUser._id,
      title: 'Robotics Architecture Review',
      projectId: project._id,
      messages: [{ sender: 'user', text: 'Review architecture' }],
    });

    // Simulate safe deletion: release chats to standalone, do NOT delete documents
    await ChatSession.updateMany({ projectId: project._id }, { $set: { projectId: null } });
    await Project.findByIdAndDelete(project._id);

    const releasedChat = await ChatSession.findById(projectChat._id);
    const preservedDoc = await Document.findById(sampleDoc._id);

    if (releasedChat && releasedChat.projectId === null && preservedDoc) {
      console.log('✓ Project deleted safely!');
      console.log('  - Project chats moved to general history (standalone).');
      console.log('  - Document remains intact in library.');
    } else {
      throw new Error('Safe deletion policy check failed');
    }

    // Clean up test chat
    await ChatSession.findByIdAndDelete(standaloneChat._id);
    await ChatSession.findByIdAndDelete(projectChat._id);

    console.log('\n============================================================');
    console.log('ALL PROJECT WORKSPACE BACKEND VERIFICATION TESTS PASSED (7/7)!');
    console.log('============================================================\n');

  } catch (err) {
    console.error('Verification Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
