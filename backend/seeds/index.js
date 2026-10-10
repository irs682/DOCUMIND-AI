const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Document = require('../models/Document');
const KnowledgeBase = require('../models/KnowledgeBase');
const AuditLog = require('../models/AuditLog');
const AIRequest = require('../models/AIRequest');

const ADMIN_NAME = process.env.ADMIN_NAME || 'DocuMind Administrator';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@documind.ai').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

const DEMO_USER_NAME = 'Demo User';
const DEMO_USER_EMAIL = 'user@documind.ai';
const DEMO_USER_PASSWORD = 'password123';

const seedAll = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai';
  console.log('\n=============================================');
  console.log('🚀 DOCUMIND-AI: Comprehensive Database Seeder');
  console.log('=============================================');
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB successfully.\n');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.error('\nPlease verify MongoDB is running or check backend/.env');
    process.exit(1);
  }

  try {
    // 1. Seed or Update Admin User
    console.log('👤 Seeding Admin User...');
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (admin) {
      admin.name = ADMIN_NAME;
      admin.role = 'admin';
      admin.status = 'active';
      admin.isActive = true;
      admin.password = ADMIN_PASSWORD;
      await admin.save();
      console.log(`  ✔ Admin user updated: ${admin.email} (ID: ${admin._id})`);
    } else {
      admin = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        status: 'active',
        isActive: true,
      });
      console.log(`  ✔ Admin user created: ${admin.email} (ID: ${admin._id})`);
    }

    // 2. Seed or Update Demo User
    console.log('👥 Seeding Regular Demo User...');
    let demoUser = await User.findOne({ email: DEMO_USER_EMAIL });
    if (demoUser) {
      demoUser.name = DEMO_USER_NAME;
      demoUser.role = 'user';
      demoUser.status = 'active';
      demoUser.isActive = true;
      demoUser.password = DEMO_USER_PASSWORD;
      await demoUser.save();
      console.log(`  ✔ Demo user updated: ${demoUser.email} (ID: ${demoUser._id})`);
    } else {
      demoUser = await User.create({
        name: DEMO_USER_NAME,
        email: DEMO_USER_EMAIL,
        password: DEMO_USER_PASSWORD,
        role: 'user',
        status: 'active',
        isActive: true,
      });
      console.log(`  ✔ Demo user created: ${demoUser.email} (ID: ${demoUser._id})`);
    }

    // 3. Seed Knowledge Bases
    console.log('📚 Seeding Knowledge Bases...');
    const existingKBs = await KnowledgeBase.countDocuments();
    let primaryKB;
    if (existingKBs === 0) {
      primaryKB = await KnowledgeBase.create({
        name: 'Enterprise Intelligence & Compliance',
        description: 'Core organizational knowledge, policies, technical documentation, and compliance guidelines.',
        isPrivate: false,
        embeddingModel: 'text-embedding-3-small',
        owner: admin._id,
        docCount: 3,
        vectorCount: 154,
      });
      await KnowledgeBase.create({
        name: 'Financial Reports & Auditing 2026',
        description: 'Quarterly financial reports, audit trails, and risk assessment spreadsheets.',
        isPrivate: true,
        embeddingModel: 'text-embedding-3-small',
        owner: admin._id,
        docCount: 2,
        vectorCount: 98,
      });
      console.log('  ✔ Sample knowledge bases created.');
    } else {
      primaryKB = await KnowledgeBase.findOne({});
      console.log(`  ℹ Existing knowledge bases found (${existingKBs}). Skipping KB creation.`);
    }

    // 4. Seed Sample Documents
    console.log('📄 Seeding Sample Documents...');
    const existingDocs = await Document.countDocuments();
    let sampleDoc;
    if (existingDocs === 0 && primaryKB) {
      sampleDoc = await Document.create({
        name: 'DOCUMIND_Enterprise_Architecture_Overview.pdf',
        originalName: 'DOCUMIND_Enterprise_Architecture_Overview.pdf',
        filePath: 'uploads/sample-architecture.pdf',
        mimeType: 'application/pdf',
        size: 2450000,
        formattedSize: '2.4 MB',
        status: 'indexed',
        knowledgeBase: primaryKB.name,
        knowledgeBaseId: primaryKB._id,
        owner: admin._id,
        chunksCount: 42,
        totalTokens: 18450,
        summary: 'Architectural overview of DocuMind AI, outlining vector embeddings, hybrid RAG retrievers, and agentic workflows.',
        chunks: [
          {
            index: 0,
            text: 'DOCUMIND AI leverages neural search engines and multi-agent coordination for enterprise document synthesis.',
            tokenCount: 15,
            embedding: [],
            pageNumber: 1,
          },
        ],
      });

      await Document.create({
        name: 'SOC2_Compliance_And_Security_Controls.pdf',
        originalName: 'SOC2_Compliance_And_Security_Controls.pdf',
        filePath: 'uploads/sample-compliance.pdf',
        mimeType: 'application/pdf',
        size: 1840000,
        formattedSize: '1.8 MB',
        status: 'indexed',
        knowledgeBase: primaryKB.name,
        knowledgeBaseId: primaryKB._id,
        owner: admin._id,
        chunksCount: 36,
        totalTokens: 14200,
        summary: 'Security governance matrix detailing encryption standards, RBAC privilege levels, and audit protocols.',
        chunks: [],
      });
      console.log('  ✔ Sample documents created.');
    } else {
      console.log(`  ℹ Existing documents found (${existingDocs}). Skipping document creation.`);
    }

    // 5. Seed Initial Audit Logs
    console.log('🛡️ Seeding Initial Audit Logs...');
    const auditCount = await AuditLog.countDocuments();
    if (auditCount === 0) {
      await AuditLog.create([
        {
          action: 'SYSTEM_INITIALIZATION',
          performedBy: admin._id,
          performedByName: admin.name,
          targetResource: 'System',
          details: 'Database seeded and initial services bootstrapped.',
          ipAddress: '127.0.0.1',
          status: 'success',
        },
        {
          action: 'ADMIN_PROVISIONED',
          performedBy: admin._id,
          performedByName: 'Bootstrap Seeder',
          targetResource: `User: ${admin.email}`,
          details: 'Primary administrator privileges assigned.',
          ipAddress: '127.0.0.1',
          status: 'success',
        },
      ]);
      console.log('  ✔ Initial audit logs created.');
    } else {
      console.log(`  ℹ Existing audit logs found (${auditCount}). Skipping audit log creation.`);
    }

    // 6. Seed Sample AI Requests for Monitoring
    console.log('📊 Seeding Sample AI Request Telemetry...');
    const aiRequestCount = await AIRequest.countDocuments();
    if (aiRequestCount === 0) {
      const types = ['rag', 'chat', 'research', 'embedding'];
      const requests = [];
      for (let i = 0; i < 20; i++) {
        const type = types[i % types.length];
        const isFailed = i === 13; // 1 failure for chart telemetry
        requests.push({
          user: admin._id,
          type,
          knowledgeBaseId: primaryKB?._id || null,
          documentId: sampleDoc?._id || null,
          status: isFailed ? 'failed' : 'success',
          latencyMs: 150 + Math.floor(Math.random() * 450),
          errorCode: isFailed ? 'CONTEXT_WINDOW_EXCEEDED' : '',
          createdAt: new Date(Date.now() - i * 3600000),
        });
      }
      await AIRequest.insertMany(requests);
      console.log('  ✔ Sample AI request telemetry seeded.');
    } else {
      console.log(`  ℹ Existing AI telemetry found (${aiRequestCount}). Skipping.`);
    }

    console.log('\n=============================================');
    console.log('✨ All Seed Data Initialized Successfully!');
    console.log('=============================================');
    console.log('Admin Account:');
    console.log(`  • Email:    ${ADMIN_EMAIL}`);
    console.log(`  • Password: ${ADMIN_PASSWORD}`);
    console.log(`  • Role:     admin`);
    console.log('---------------------------------------------');
    console.log('Demo User Account:');
    console.log(`  • Email:    ${DEMO_USER_EMAIL}`);
    console.log(`  • Password: ${DEMO_USER_PASSWORD}`);
    console.log(`  • Role:     user`);
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Error during database seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.\n');
    process.exit(0);
  }
};

seedAll();
