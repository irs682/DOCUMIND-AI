const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const ResearchProject = require('../models/ResearchProject');

async function dump() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai');
  const project = await ResearchProject.findOne({}).lean();
  console.log('Project ID:', project._id);
  console.log('Title:', project.title);
  console.log('Topic:', project.topic);
  console.log('Status:', project.status);
  console.log('Literature count:', (project.literature || []).length);
  (project.literature || []).forEach((l, i) => {
    console.log(` Lit [${i}]: ${l.title} (${l.year}) - authors: ${JSON.stringify(l.authors)} - doi: ${l.doi}`);
  });
  console.log('Canonical Sources count:', (project.canonicalSources || []).length);
  (project.canonicalSources || []).forEach((c, i) => {
    console.log(` Can [${i}]: ${c.title} (${c.year}) - citationKey: ${c.citationKey}`);
  });
  console.log('Research Gaps count:', (project.researchGaps || []).length);
  (project.researchGaps || []).forEach((g, i) => {
    console.log(` Gap [${i}]: ${g.title} - ${g.description}`);
  });
  console.log('Benchmarks:', (project.benchmarks || []).map(b => b.name));
  console.log('Baselines:', (project.baselines || []).map(b => b.name));
  console.log('Metrics:', (project.metrics || []).map(m => m.name));
  console.log('UserResults count:', (project.userResults || []).length);
  
  if (project.generatedDraft) {
    console.log('\n--- GENERATED DRAFT ---');
    console.log('Title:', project.generatedDraft.title);
    console.log('Mode:', project.generatedDraft.manuscriptMode);
    console.log('Quality Score:', project.generatedDraft.qualityScore);
    console.log('Sections:');
    (project.generatedDraft.sections || []).forEach((s, i) => {
      console.log(` Sec [${i}]: ${s.heading} (${s.body?.length || 0} chars)`);
    });
    console.log('Manuscript Objects:');
    (project.generatedDraft.manuscriptObjects || []).forEach((o, i) => {
      console.log(` Obj [${i}]: ${o.id} | ${o.objectType} | ${o.displayLabel}: ${o.title}`);
    });
    console.log('References count:', (project.generatedDraft.references || []).length);
    (project.generatedDraft.references || []).forEach((r, i) => console.log(` Ref [${i}]: ${r}`));
    console.log('Validation checks count:', (project.generatedDraft.validationChecks || []).length);
    (project.generatedDraft.validationChecks || []).filter(c => !c.passed).forEach(c => {
      console.log(` Failed Check: ${c.label} (${c.id})`);
    });
  }

  process.exit(0);
}

dump().catch(console.error);
