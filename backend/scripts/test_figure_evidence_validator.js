const {
  isArtifactEntity,
  normalizeEntityName,
  normalizeParticipants,
  validateInteractions,
  buildVerifiedFigureEvidence,
  stripInternalReasoning,
} = require('../services/figureEvidenceValidatorService');

function runUnitTests() {
  console.log("================================================================================");
  console.log("  FIGURE EVIDENCE VALIDATOR & CLEANING UNIT TESTS");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(cond, name, details = '') {
    total++;
    if (cond) {
      passed++;
      console.log(`  ✅ PASS: ${name} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `[FAILED: ${details}]` : ''}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. TEST FOR ARTIFACT FILTERING (SECTION 17)
  // ---------------------------------------------------------------------------
  console.log("--- 1. ARTIFACT FILTERING TESTS ---");
  const noiseCandidates = [
    "Visual",
    "image",
    "Figure 3",
    "Diagram",
    "Caption",
    "Text",
    "object",
    "[object Object]",
    "component",
    "participant",
    "actor",
    "lifeline",
    "string",
    "list of strings",
    "---",
    "12345",
  ];

  for (const noise of noiseCandidates) {
    assert(isArtifactEntity(noise), `Artifact filtered: "${noise}"`);
  }

  const validCandidates = [
    "Finance Manager",
    "React Client",
    "Auth API",
    "Redis",
    "PostgreSQL",
    "Branch Manager",
  ];

  for (const valid of validCandidates) {
    assert(!isArtifactEntity(valid), `Valid participant accepted: "${valid}"`);
  }

  const normalized = normalizeParticipants([
    "Visual",
    "Finance Manager",
    "  finance manager  ",
    "Auth API",
    "AUTH API",
    "Diagram",
    { name: "React Client" },
    { name: "Redis" },
    "Caption",
    "PostgreSQL",
    "[object Object]",
  ]);

  assert(normalized.length === 5, "Normalized participants count is exactly 5", `count=${normalized.length}`);
  assert(!normalized.includes("Visual"), "Noise 'Visual' eliminated from normalized list");
  assert(!normalized.includes("Diagram"), "Noise 'Diagram' eliminated from normalized list");
  assert(!normalized.includes("Caption"), "Noise 'Caption' eliminated from normalized list");
  assert(!normalized.includes("[object Object]") && !normalized.includes("object Object"), "Object artifacts eliminated");

  // ---------------------------------------------------------------------------
  // 2. TEST FOR DUPLICATION & INTERACTION VALIDATION (SECTION 16)
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. INTERACTION VALIDATION & DEDUPLICATION TESTS ---");
  const rawInteractions = [
    { from: "Finance Manager", to: "React Client", action: "Enter email and password" },
    { from: "React Client", to: "Auth API", action: "POST /api/v1/auth/login" },
    { from: "React Client", to: "Auth API", action: "POST /api/v1/auth/login" }, // exact duplicate
    { from: "React Client", to: "Auth API", action: "post /api/v1/auth/login" }, // casing duplicate
    { from: "Auth API", to: "Redis", action: "Read failure counter" },
    { from: "Auth API", to: "Redis", action: "Read failure counter for identifier" }, // minor phrasing variant
    { from: "Auth API", to: "PostgreSQL", action: "Load user and verify argon2id hash" },
    { from: "Unknown Hacker", to: "Unknown Service", action: "Arbitrary action" }, // invalid endpoints
    { from: "Auth API", to: "PostgreSQL", action: "Validate code against mfasecrets solid line with arrowhead pointing to PostgreSQL." }, // drawing artifact
  ];

  const verifiedInteractions = validateInteractions(rawInteractions, normalized);
  
  // Verify deduplication: POST /api/v1/auth/login must appear only ONCE
  const loginSteps = verifiedInteractions.filter(i => i.label.toLowerCase().includes("post /api/v1/auth/login"));
  assert(loginSteps.length === 1, "POST /api/v1/auth/login deduplicated to single step", `count=${loginSteps.length}`);

  // Verify failure counter check appears only ONCE
  const counterSteps = verifiedInteractions.filter(i => i.label.toLowerCase().includes("failure counter"));
  assert(counterSteps.length === 1, "Failure counter deduplicated to single step", `count=${counterSteps.length}`);

  // Verify graphical drawing artifact was stripped
  const cleanedArrow = verifiedInteractions.find(i => i.label.toLowerCase().includes("validate code"));
  assert(
    cleanedArrow && !cleanedArrow.label.includes("solid line with arrowhead"),
    "Drawing artifact stripped from interaction label",
    cleanedArrow?.label
  );

  // Verify invalid endpoints rejected or flagged
  const unknownSteps = verifiedInteractions.filter(i => i.from === "Unknown Hacker");
  assert(unknownSteps.length === 0, "Interactions with invalid endpoints discarded");

  // ---------------------------------------------------------------------------
  // 3. TEST FOR UNSUPPORTED FIGURE CONTENT (SECTION 18)
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. UNSUPPORTED FIGURE CONTENT TESTS ---");
  const emptyFigure = buildVerifiedFigureEvidence({
    figureId: "Figure 99",
    participants: [],
    interactions: [],
  });
  assert(emptyFigure.evidence_status === "INSUFFICIENT_EVIDENCE", "Empty figure flagged as INSUFFICIENT_EVIDENCE");
  assert(emptyFigure.verified === false, "Empty figure verified === false");

  const partialFigure = buildVerifiedFigureEvidence({
    figureId: "Figure 10",
    participants: ["Component A"],
    interactions: [],
  });
  assert(partialFigure.evidence_status === "PARTIAL", "Single participant figure flagged as PARTIAL");
  assert(partialFigure.verified === false, "Partial figure verified === false");

  // ---------------------------------------------------------------------------
  // 4. TEST FOR REASONING & SCRATCHPAD STRIPPING (SECTION 2)
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. INTERNAL REASONING STRIPPING TESTS ---");
  const rawThinkingText = `<think>
I need to check the participants in Figure 3.
Let's see: Finance Manager, React Client, Auth API...
</think>Thinking Process:
1. Analyze the Request: The user wants participants from Figure 3.
2. Evaluate candidates: Visual is just a header, drop it.
Let me check the exact sequence...

Figure 3 contains five participants:
- Finance Manager
- React Client
- Auth API
- Redis
- PostgreSQL`;

  const stripped = stripInternalReasoning(rawThinkingText);
  assert(!stripped.includes("<think>"), "<think> tags stripped");
  assert(!stripped.includes("Thinking Process:"), "'Thinking Process:' stripped");
  assert(!stripped.includes("Analyze the Request:"), "'Analyze the Request:' stripped");
  assert(!stripped.includes("Let me check"), "'Let me check' stripped");
  assert(stripped.startsWith("Figure 3 contains five participants:"), "Output starts immediately with clean answer");

  console.log("\n================================================================================");
  console.log(`  UNIT TEST RESULTS: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("================================================================================\n");

  if (passed < total) process.exit(1);
}

runUnitTests();
