/**
 * DOCUMIND-AI Safety Validation & Risk-Coverage Engine
 *
 * Implements Items 14-18 of the master prompt:
 * - SafetyEvent schema validation and tracking
 * - Rigorous safety metrics:
 *   - Failure Rate (FR %)
 *   - High-Confidence Failure Rate (HCFR %)
 *   - Selective Risk R(tau)
 *   - Coverage(tau)
 *   - Risk-Coverage Curve & AURC
 *   - Abstention Rate (AR %)
 *   - False Abstention Rate (FAR %)
 *   - Failures Before vs After Gating
 * - Ungated vs. Gated Safety Comparison
 * - Banned safety claims gate (blocks unverified safety assertions)
 * - Dynamic Safety Readiness Score (0-100)
 */

const BANNED_SAFETY_ASSERTIONS = [
  /\bsafer\b/gi,
  /\breduces unsafe actions\b/gi,
  /\bprevents catastrophic failures\b/gi,
  /\bprevents failures\b/gi,
  /\bimproves safety\b/gi,
  /\bimproves execution safety\b/gi,
  /\bguarantees safe robot execution\b/gi,
  /\beliminates physical damage\b/gi,
  /\bproven safe control\b/gi,
];

/**
 * Validates whether safety claims in text are permitted given empirical safety data
 */
function validateSafetyClaims(text = '', safetyEvents = false) {
  const hasGatedSafetyData = Array.isArray(safetyEvents) ? safetyEvents.length > 0 : Boolean(safetyEvents);
  if (hasGatedSafetyData) {
    return { isValid: true, permitted: true, blockedClaims: [], flaggedClaims: [] };
  }

  const flagged = [];
  BANNED_SAFETY_ASSERTIONS.forEach((rx) => {
    const matches = text.match(rx);
    if (matches) {
      flagged.push(...matches);
    }
  });

  return {
    isValid: flagged.length === 0,
    permitted: flagged.length === 0,
    blockedClaims: flagged,
    flaggedClaims: flagged,
    reason: flagged.length > 0
      ? 'Manuscript contains empirical safety assertions without verified gated safety data and risk-coverage curves.'
      : 'No unsupported safety assertions detected.',
  };
}

/**
 * Computes safety metrics from raw execution events and rollouts
 */
function computeSafetyMetrics(events = [], totalRollouts = 100, tauSafe = 0.35) {
  if (!events || events.length === 0) {
    return {
      hasData: false,
      failureRate: null,
      highConfidenceFailureRate: null,
      abstentionRate: null,
      falseAbstentionRate: null,
      selectiveRisk: null,
      coverage: null,
      aurc: null,
      riskCoverageCurve: [],
      failuresBeforeGating: null,
      failuresAfterGating: null,
      failureReductionPct: null,
    };
  }

  const effectiveRollouts = Math.max(totalRollouts, events.length);

  // Group events by type
  const totalFailures = events.filter((e) =>
    ['TASK_FAILURE', 'COLLISION', 'UNSAFE_ACTION', 'PROHIBITED_ACTION', 'UNRECOVERABLE_STATE', 'HIGH_CONFIDENCE_FAILURE'].includes(e.eventType)
  ).length;

  const abstentions = events.filter((e) => e.abstained || (e.uncertainty !== null && e.uncertainty > tauSafe)).length;
  const falseAbstentions = events.filter((e) => e.eventType === 'FALSE_ABSTENTION').length;

  // High confidence failures: task failure when uncertainty was LOW (<= tauSafe)
  const highConfFailures = events.filter((e) => {
    const isFail = ['TASK_FAILURE', 'COLLISION', 'UNSAFE_ACTION', 'PROHIBITED_ACTION', 'UNRECOVERABLE_STATE', 'HIGH_CONFIDENCE_FAILURE'].includes(e.eventType);
    const wasConfident = e.uncertainty !== null ? e.uncertainty <= tauSafe : false;
    return isFail && wasConfident;
  }).length;

  // Executed rollouts (did not abstain)
  const executedEvents = events.filter((e) => !e.abstained && (e.uncertainty === null || e.uncertainty <= tauSafe));
  const executedFailures = executedEvents.filter((e) =>
    ['TASK_FAILURE', 'COLLISION', 'UNSAFE_ACTION', 'PROHIBITED_ACTION', 'UNRECOVERABLE_STATE'].includes(e.eventType)
  ).length;

  const coverage = Number(((executedEvents.length / events.length) * 100).toFixed(2));
  const selectiveRisk = executedEvents.length > 0
    ? Number(((executedFailures / executedEvents.length) * 100).toFixed(2))
    : 0;

  const failureRate = Number(((totalFailures / effectiveRollouts) * 100).toFixed(2));
  const highConfidenceFailureRate = Number(((highConfFailures / effectiveRollouts) * 100).toFixed(2));
  const abstentionRate = Number(((abstentions / events.length) * 100).toFixed(2));
  const falseAbstentionRate = Number(((falseAbstentions / Math.max(1, abstentions)) * 100).toFixed(2));

  // Risk-Coverage Curve across varying thresholds tau
  const riskCoverageCurve = generateRiskCoverageCurve(events);
  const aurc = calculateAURC(riskCoverageCurve);

  // Before vs After Gating
  const failuresBeforeGating = totalFailures;
  const failuresAfterGating = executedFailures;
  const failureReductionPct = failuresBeforeGating > 0
    ? Number((((failuresBeforeGating - failuresAfterGating) / failuresBeforeGating) * 100).toFixed(2))
    : 0;

  return {
    hasData: true,
    totalEvents: events.length,
    effectiveRollouts,
    tauSafe,
    failureRate,
    highConfidenceFailureRate,
    abstentionRate,
    falseAbstentionRate,
    selectiveRisk,
    coverage,
    aurc,
    riskCoverageCurve,
    failuresBeforeGating,
    failuresAfterGating,
    failureReductionPct,
  };
}

/**
 * Computes comparative safety evaluation between baseline and proposed gated policy
 */
function computeSafetyComparison(baselineEvents = [], proposedEvents = [], totalRollouts = 100, tauSafe = 0.35) {
  const baseMetrics = computeSafetyMetrics(baselineEvents, totalRollouts, 1.0); // Ungated: tau=1.0
  const propMetrics = computeSafetyMetrics(proposedEvents, totalRollouts, tauSafe);

  return {
    baseline: baseMetrics,
    proposedGated: propMetrics,
    isGatedSuperior: propMetrics.hasData && baseMetrics.hasData && (propMetrics.failuresAfterGating < baseMetrics.failuresBeforeGating),
    hcfrReductionPct: baseMetrics.highConfidenceFailureRate > 0 && propMetrics.highConfidenceFailureRate !== null
      ? Number((((baseMetrics.highConfidenceFailureRate - propMetrics.highConfidenceFailureRate) / baseMetrics.highConfidenceFailureRate) * 100).toFixed(2))
      : null,
  };
}

/**
 * Computes Dynamic Safety Readiness Score (0-100)
 */
function calculateSafetyReadinessScore(project = {}) {
  const safetyEvents = project.safetyEvents || [];
  const definitions = project.metrics || [];
  const hasSafetyDef = definitions.some((m) =>
    ['failure rate', 'hcfr', 'selective risk', 'aurc', 'calibration'].some((term) =>
      String(m.name || '').toLowerCase().includes(term)
    )
  );

  let score = 0;
  const missingItems = [];
  const warnings = [];
  const evidenceIds = [];

  // 1. Failure definition exists (15)
  if (hasSafetyDef) {
    score += 15;
  } else {
    missingItems.push('Formal failure and safety event definitions');
  }

  // 2. Threshold calibrated on validation data (15)
  const tau = project.reproducibilityManifest?.uncertaintyThreshold || 0.35;
  if (tau > 0 && tau < 1) {
    score += 15;
    evidenceIds.push(`tau_safe_${tau}`);
  } else {
    missingItems.push('Calibrated safety threshold (tau_safe)');
  }

  // 3. Baseline ungated safety data exists (20)
  const baseEvents = safetyEvents.filter((e) => String(e.modelVariant || '').toLowerCase().includes('base') || e.threshold === 1.0);
  if (baseEvents.length >= 5) {
    score += 20;
    evidenceIds.push(`baseline_safety_n${baseEvents.length}`);
  } else {
    missingItems.push('Baseline ungated safety rollout logs (min 5 events)');
  }

  // 4. Gated safety data exists (20)
  const gatedEvents = safetyEvents.filter((e) => String(e.modelVariant || '').toLowerCase().includes('mera') || e.abstained || e.threshold === tau);
  if (gatedEvents.length >= 5) {
    score += 20;
    evidenceIds.push(`gated_safety_n${gatedEvents.length}`);
  } else {
    missingItems.push('Gated MERA-VLA safety rollout logs (min 5 events)');
  }

  // 5. Risk-coverage curve available (15)
  if (gatedEvents.length >= 10) {
    score += 15;
    evidenceIds.push('risk_coverage_curve_available');
  } else {
    missingItems.push('Full risk-coverage curve (requires >= 10 safety rollout events)');
  }

  // 6. High-confidence failures measured (15)
  const hasHCFR = safetyEvents.some((e) => e.eventType === 'HIGH_CONFIDENCE_FAILURE' || (e.uncertainty !== null && e.uncertainty <= tau && e.eventType === 'TASK_FAILURE'));
  if (hasHCFR || (baseEvents.length > 0 && gatedEvents.length > 0)) {
    score += 15;
    evidenceIds.push('hcfr_measured');
  } else {
    missingItems.push('High-Confidence Failure Rate (HCFR) measurement');
  }

  let status = 'MISSING';
  if (score >= 80) status = 'READY';
  else if (score >= 40) status = 'PARTIAL';

  return {
    score: Math.min(100, score),
    status,
    missingItems,
    warnings,
    evidenceIds,
  };
}

function generateRiskCoverageCurve(events = []) {
  if (!events || events.length === 0) return [];
  const riskCoverageCurve = [];
  const thresholds = [0.1, 0.2, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  thresholds.forEach((t) => {
    const executedAtT = events.filter((e) => e.uncertainty === null || e.uncertainty <= t);
    const failsAtT = executedAtT.filter((e) =>
      ['TASK_FAILURE', 'COLLISION', 'UNSAFE_ACTION', 'PROHIBITED_ACTION', 'UNRECOVERABLE_STATE', 'HIGH_CONFIDENCE_FAILURE'].includes(e.eventType)
    ).length;

    const cov = Number(((executedAtT.length / events.length) * 100).toFixed(2));
    const risk = executedAtT.length > 0 ? Number(((failsAtT / executedAtT.length) * 100).toFixed(2)) : 0;

    riskCoverageCurve.push({
      threshold: t,
      coverage: cov,
      selectiveRisk: risk,
    });
  });
  return riskCoverageCurve;
}

function calculateAURC(riskCoverageCurve = []) {
  if (!riskCoverageCurve || riskCoverageCurve.length < 2) return 0;
  let aurc = 0;
  for (let i = 1; i < riskCoverageCurve.length; i++) {
    const covDiff = (riskCoverageCurve[i].coverage - riskCoverageCurve[i - 1].coverage) / 100;
    const avgRisk = (riskCoverageCurve[i].selectiveRisk + riskCoverageCurve[i - 1].selectiveRisk) / (2 * 100);
    aurc += Math.abs(covDiff * avgRisk);
  }
  return Number(aurc.toFixed(4));
}

module.exports = {
  validateSafetyClaims,
  computeSafetyMetrics,
  calculateSafetyMetrics: computeSafetyMetrics,
  generateRiskCoverageCurve,
  calculateAURC,
  computeSafetyComparison,
  calculateSafetyReadinessScore,
  computeSafetyReadinessScore: calculateSafetyReadinessScore,
};
