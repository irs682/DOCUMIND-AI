const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const ResearchProject = require('../models/ResearchProject');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai');
  const count = await ResearchProject.countDocuments();
  console.log('ResearchProject count:', count);
  const projects = await ResearchProject.find({}, { title: 1, topic: 1, generatedDraft: 1 }).lean();
  for (const p of projects) {
    console.log(`ID: ${p._id.toString()} | Title: ${p.title || p.topic}`);
    if (p.generatedDraft) {
      console.log(`  Draft Title: ${p.generatedDraft.title}`);
      console.log(`  Draft Mode: ${p.generatedDraft.manuscriptMode}`);
      console.log(`  Draft Sections: ${(p.generatedDraft.sections || []).length}`);
      console.log(`  Draft Objects: ${(p.generatedDraft.manuscriptObjects || []).length}`);
    }
  }
  process.exit(0);
}

check().catch(console.error);
