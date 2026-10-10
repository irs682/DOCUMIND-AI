require('dotenv').config({ path: './backend/.env' });
const { executeResearchPipeline } = require('../services/researchPipelineService');

async function testVlaRejection() {
  const vlaTopic = "Memory-Augmented and Uncertainty-Aware Vision-Language-Action Models for Trustworthy Autonomous Robot Decision-Making";
  
  // Simulated retrieved chunks from vector store that only contain BakeSuite authentication
  const authChunks = [
    {
      documentName: "1-FR-AUTH.docx",
      text: "FR-AUTH-004: Multi-Factor Authentication. The system shall provide multi-factor authentication with TOTP as primary factor, SMS OTP as fallback, and exactly 10 single-use recovery codes. Mandatory for System Administrator, Owner, CEO, and Finance Manager.",
      score: 0.88,
      metadata: { section: "3.1.4 FR-AUTH-004" }
    },
    {
      documentName: "1-FR-AUTH.docx",
      text: "FR-AUTH-001: Staff Login. The system shall authenticate staff members with an email address or username plus password. Issues RS256-signed JWT access tokens with 15-minute lifetime.",
      score: 0.85,
      metadata: { section: "3.1.1 FR-AUTH-001" }
    }
  ];

  console.log("=== RUNNING VLA QUERY AGAINST AUTH DATABASE ===");
  const report = await executeResearchPipeline({
    topic: vlaTopic,
    questions: "What are the episodic memory mechanisms and uncertainty estimation strategies?",
    retrievedChunks: authChunks
  });

  console.log("Decision Status:", report.status);
  console.log("Evidence Status:", report.evidenceStatus);
  console.log("Citations Count:", report.citations.length);
  console.log("\n=== SECTIONS GENERATED ===");
  for (const s of report.sections) {
    console.log(`\n### ${s.heading}`);
    console.log(s.body);
  }
}

testVlaRejection().catch(console.error);
