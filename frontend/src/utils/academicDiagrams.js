/**
 * DOCUMIND-AI Academic Conceptual Diagram SVG Generators
 * 
 * Generates vector graphics for:
 * 1. MERA-VLA System Architecture
 * 2. Episodic Memory Retrieval & Fusion Flow
 * 3. Uncertainty-Aware Action Selection & Safe Abstention Flow
 * 4. Standardized Evaluation & Benchmark Protocol
 * 
 * All diagrams are explicitly watermarked and labeled: GENERATED_CONCEPTUAL_FIGURE
 */

export const DIAGRAM_TYPES = [
  {
    id: 'fig-mera-arch',
    title: 'MERA-VLA End-to-End System Architecture',
    caption: 'Figure 1. Proposed MERA-VLA architecture integrating episodic memory retrieval, multimodal state representation, uncertainty-aware policy planning, safe action decoding, and human-in-the-loop abstention.',
    category: 'conceptual_diagram',
  },
  {
    id: 'fig-mera-retrieval',
    title: 'Episodic Memory Retrieval & Multi-modal Cross-Attention',
    caption: 'Figure 2. Episodic memory retrieval pipeline showing cosine similarity matching against experience buffer, k-NN ranking, and cross-attention conditioning for policy decoding.',
    category: 'conceptual_diagram',
  },
  {
    id: 'fig-mera-uncertainty',
    title: 'Uncertainty Estimation & HITL Safe Abstention Mechanism',
    caption: 'Figure 3. Uncertainty-aware decision tree decomposing epistemic variance and policy entropy against safety threshold tau_safe to trigger either autonomous execution or supervisor intervention.',
    category: 'conceptual_diagram',
  },
  {
    id: 'fig-mera-protocol',
    title: 'Standardized Empirical Benchmark Evaluation Protocol',
    caption: 'Figure 4. Comparative benchmarking pipeline ensuring identical observation horizons, task splits, action budgets, and metric computation across CALVIN and LIBERO suites.',
    category: 'conceptual_diagram',
  },
];

export function generateMeraArchitectureSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" width="100%" height="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff;">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#3730a3" />
    </linearGradient>
    <linearGradient id="memoryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="safetyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16a34a" />
      <stop offset="100%" stop-color="#15803d" />
    </linearGradient>
    <linearGradient id="abstainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#b91c1c" />
    </linearGradient>
    <filter id="boxShadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08" />
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
    </marker>
    <marker id="arrowPrimary" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5" />
    </marker>
  </defs>

  <!-- Title & Conceptual Watermark -->
  <rect x="20" y="15" width="860" height="490" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
  <text x="450" y="45" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a" letter-spacing="0.5">MERA-VLA: SYSTEM ARCHITECTURE &amp; RETRIEVAL FLOW</text>
  <rect x="35" y="32" width="230" height="20" rx="10" fill="#fef3c7" stroke="#fde68a" stroke-width="1" />
  <text x="150" y="46" text-anchor="middle" font-size="9" font-weight="700" fill="#92400e" letter-spacing="0.5">GENERATED CONCEPTUAL DIAGRAM</text>

  <!-- 1. MULTIMODAL OBSERVATION INPUTS -->
  <g transform="translate(45, 80)">
    <rect width="180" height="135" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" filter="url(#boxShadow)" />
    <text x="90" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">1. Observation Space</text>
    <rect x="15" y="36" width="150" height="26" rx="6" fill="#f1f5f9" />
    <text x="90" y="53" text-anchor="middle" font-size="10" font-weight="600" fill="#1e293b">Visual Stream (o_t)</text>
    <rect x="15" y="68" width="150" height="26" rx="6" fill="#f1f5f9" />
    <text x="90" y="85" text-anchor="middle" font-size="10" font-weight="600" fill="#1e293b">Language Command (l)</text>
    <rect x="15" y="100" width="150" height="26" rx="6" fill="#f1f5f9" />
    <text x="90" y="117" text-anchor="middle" font-size="10" font-weight="600" fill="#1e293b">Proprioceptive State (q_t)</text>
  </g>

  <!-- Connector: Inputs to Encoder -->
  <line x1="225" y1="148" x2="265" y2="148" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- 2. MULTIMODAL ENCODER -->
  <g transform="translate(265, 80)">
    <rect width="165" height="135" rx="12" fill="url(#primaryGrad)" filter="url(#boxShadow)" />
    <text x="82" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">2. Multimodal Encoder</text>
    <rect x="15" y="45" width="135" height="34" rx="6" fill="rgba(255,255,255,0.15)" />
    <text x="82" y="66" text-anchor="middle" font-size="10" font-weight="500" fill="#ffffff">Vision Transformer</text>
    <rect x="15" y="86" width="135" height="34" rx="6" fill="rgba(255,255,255,0.15)" />
    <text x="82" y="107" text-anchor="middle" font-size="10" font-weight="500" fill="#ffffff">Llama Tokenizer</text>
  </g>

  <!-- Connector: Encoder to Representation -->
  <line x1="430" y1="148" x2="470" y2="148" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)" />

  <!-- 3. JOINT EMBEDDING & MEMORY QUERY -->
  <g transform="translate(470, 95)">
    <rect width="165" height="105" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" filter="url(#boxShadow)" />
    <text x="82" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">3. Joint Latent Space</text>
    <rect x="15" y="38" width="135" height="50" rx="8" fill="#e0e7ff" />
    <text x="82" y="58" text-anchor="middle" font-size="10" font-weight="700" fill="#3730a3">Fused Token Prefix</text>
    <text x="82" y="74" text-anchor="middle" font-size="9" font-weight="500" fill="#4f46e5">z_t = [v_t; l_t; q_t]</text>
  </g>

  <!-- 4. EPISODIC MEMORY BUFFER (Branching down) -->
  <line x1="552" y1="200" x2="552" y2="245" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
  <g transform="translate(450, 245)">
    <rect width="205" height="95" rx="12" fill="url(#memoryGrad)" filter="url(#boxShadow)" />
    <text x="102" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">4. Episodic Memory Retrieval</text>
    <rect x="15" y="38" width="175" height="42" rx="6" fill="rgba(255,255,255,0.15)" />
    <text x="102" y="55" text-anchor="middle" font-size="10" font-weight="600" fill="#ffffff">k-NN Trajectory Bank</text>
    <text x="102" y="71" text-anchor="middle" font-size="9" font-weight="400" fill="#e0f2fe">Cosine Sim: M_ret = Top-k(M, z_t)</text>
  </g>

  <!-- Connector: Latent to Planner -->
  <line x1="635" y1="148" x2="685" y2="148" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)" />
  <path d="M 655 292 L 767 292 L 767 220" fill="none" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />

  <!-- 5. POLICY & UNCERTAINTY ESTIMATOR -->
  <g transform="translate(685, 80)">
    <rect width="165" height="135" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" filter="url(#boxShadow)" />
    <text x="82" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">5. VLA Transformer</text>
    <rect x="15" y="36" width="135" height="36" rx="6" fill="#f1f5f9" />
    <text x="82" y="52" text-anchor="middle" font-size="10" font-weight="700" fill="#1e293b">Autoregressive Planner</text>
    <text x="82" y="66" text-anchor="middle" font-size="8" font-weight="500" fill="#64748b">Cross-Attention with M_ret</text>
    <rect x="15" y="80" width="135" height="42" rx="6" fill="#fef3c7" stroke="#fde68a" stroke-width="1" />
    <text x="82" y="96" text-anchor="middle" font-size="10" font-weight="700" fill="#b45309">Uncertainty Metric U(a)</text>
    <text x="82" y="112" text-anchor="middle" font-size="8" font-weight="600" fill="#78350f">Entropy + Ensemble Var</text>
  </g>

  <!-- Split Branch from Uncertainty: Safe vs Abstain -->
  <path d="M 767 215 L 767 360" fill="none" stroke="#64748b" stroke-width="1.5" />
  
  <!-- Branch Left: Safe Action (Green) -->
  <path d="M 767 360 L 450 360 L 450 385" fill="none" stroke="#16a34a" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="520" y="348" width="140" height="22" rx="5" fill="#dcfce7" stroke="#86efac" stroke-width="1" />
  <text x="590" y="363" text-anchor="middle" font-size="9" font-weight="700" fill="#15803d">If U(a) &lt;= tau_safe</text>

  <g transform="translate(365, 385)">
    <rect width="170" height="85" rx="10" fill="url(#safetyGrad)" filter="url(#boxShadow)" />
    <text x="85" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Autonomous Execution</text>
    <rect x="15" y="36" width="140" height="36" rx="6" fill="rgba(255,255,255,0.2)" />
    <text x="85" y="52" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">Action Decoder</text>
    <text x="85" y="66" text-anchor="middle" font-size="9" font-weight="400" fill="#f0fdf4">Robot Arm 7-DoF Waypoint</text>
  </g>

  <!-- Branch Right: Abstain / HITL (Red) -->
  <path d="M 767 360 L 767 385" fill="none" stroke="#dc2626" stroke-width="1.5" marker-end="url(#arrow)" />
  <rect x="705" y="348" width="130" height="22" rx="5" fill="#fee2e2" stroke="#fca5a5" stroke-width="1" />
  <text x="770" y="363" text-anchor="middle" font-size="9" font-weight="700" fill="#991b1b">If U(a) &gt; tau_safe</text>

  <g transform="translate(685, 385)">
    <rect width="165" height="85" rx="10" fill="url(#abstainGrad)" filter="url(#boxShadow)" />
    <text x="82" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Safe Abstention / HITL</text>
    <rect x="15" y="36" width="135" height="36" rx="6" fill="rgba(255,255,255,0.2)" />
    <text x="82" y="52" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">Supervisor Alert</text>
    <text x="82" y="66" text-anchor="middle" font-size="9" font-weight="400" fill="#fef2f2">Fallback Query to Human</text>
  </g>

  <!-- Explanation & Provenance Track -->
  <g transform="translate(45, 385)">
    <rect width="270" height="85" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" filter="url(#boxShadow)" />
    <text x="135" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">Provenance Explanation Track</text>
    <text x="135" y="44" text-anchor="middle" font-size="9" font-weight="500" fill="#475569">Retrieved Memories + Confidence + Metadata</text>
    <line x1="20" y1="52" x2="250" y2="52" stroke="#e2e8f0" stroke-width="1" />
    <text x="135" y="68" text-anchor="middle" font-size="9" font-weight="600" fill="#4f46e5">Auditable Multi-modal Explanation</text>
  </g>
  <line x1="315" y1="427" x2="365" y2="427" stroke="#64748b" stroke-width="1.5" stroke-dasharray="2,2" marker-end="url(#arrow)" />
</svg>`;
}

export function generateMeraRetrievalSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 380" width="100%" height="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff;">
  <rect x="10" y="10" width="780" height="360" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
  <text x="400" y="38" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">EPISODIC MEMORY RETRIEVAL &amp; CROSS-ATTENTION FUSION</text>
  
  <!-- Query Side -->
  <rect x="35" y="70" width="180" height="240" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
  <text x="125" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">Query Generation</text>
  <rect x="50" y="115" width="150" height="40" rx="6" fill="#e0e7ff" />
  <text x="125" y="138" text-anchor="middle" font-size="10" font-weight="600" fill="#3730a3">Current Task q_t</text>
  <rect x="50" y="170" width="150" height="40" rx="6" fill="#f1f5f9" />
  <text x="125" y="193" text-anchor="middle" font-size="10" font-weight="600" fill="#1e293b">Phi(q_t) Embedding</text>
  <rect x="50" y="230" width="150" height="55" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
  <text x="125" y="252" text-anchor="middle" font-size="9" font-weight="600" fill="#64748b">Normalized Metric</text>
  <text x="125" y="270" text-anchor="middle" font-size="8" font-family="monospace" fill="#0284c7">cos_sim = dot(q, m)</text>

  <!-- Similarity Matrix -->
  <line x1="215" y1="190" x2="280" y2="190" stroke="#64748b" stroke-width="1.5" />
  
  <rect x="280" y="70" width="220" height="240" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
  <text x="390" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="#0369a1">Experience Buffer Bank</text>
  <rect x="295" y="115" width="190" height="35" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1" />
  <text x="390" y="136" text-anchor="middle" font-size="9" font-weight="600" fill="#0369a1">Episode 1 (Sim: 0.94) [Rank 1]</text>
  <rect x="295" y="160" width="190" height="35" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1" />
  <text x="390" y="181" text-anchor="middle" font-size="9" font-weight="600" fill="#0369a1">Episode 2 (Sim: 0.88) [Rank 2]</text>
  <rect x="295" y="205" width="190" height="35" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1" />
  <text x="390" y="226" text-anchor="middle" font-size="9" font-weight="600" fill="#0369a1">Episode 3 (Sim: 0.82) [Rank 3]</text>
  <rect x="295" y="250" width="190" height="40" rx="6" fill="#f8fafc" />
  <text x="390" y="274" text-anchor="middle" font-size="9" font-weight="500" fill="#64748b">Filtered Top-k Retrieved Trajectories</text>

  <!-- Attention Fusion -->
  <line x1="500" y1="190" x2="565" y2="190" stroke="#64748b" stroke-width="1.5" />

  <rect x="565" y="70" width="200" height="240" rx="10" fill="#4f46e5" />
  <text x="665" y="98" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Policy Decoder</text>
  <rect x="580" y="115" width="170" height="50" rx="6" fill="rgba(255,255,255,0.15)" />
  <text x="665" y="136" text-anchor="middle" font-size="10" font-weight="600" fill="#ffffff">Cross-Attention Blocks</text>
  <text x="665" y="152" text-anchor="middle" font-size="8" font-weight="400" fill="#e0e7ff">Query: z_t | Key/Val: M_ret</text>
  <rect x="580" y="180" width="170" height="50" rx="6" fill="rgba(255,255,255,0.15)" />
  <text x="665" y="201" text-anchor="middle" font-size="10" font-weight="600" fill="#ffffff">Feed-Forward Transformer</text>
  <text x="665" y="217" text-anchor="middle" font-size="8" font-weight="400" fill="#e0e7ff">Action Chunk Prediction</text>
  <rect x="580" y="245" width="170" height="45" rx="6" fill="#15803d" />
  <text x="665" y="272" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">Safe Action Sequence a_t</text>
</svg>`;
}

export function generateMeraUncertaintySvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="100%" height="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff;">
  <rect x="10" y="10" width="780" height="340" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
  <text x="400" y="38" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">UNCERTAINTY ESTIMATION &amp; SAFE ABSTENTION DECISION TREE</text>

  <!-- Distribution Sampling -->
  <rect x="40" y="75" width="210" height="235" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
  <text x="145" y="100" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">Action Distribution</text>
  <rect x="55" y="120" width="180" height="42" rx="6" fill="#f1f5f9" />
  <text x="145" y="141" text-anchor="middle" font-size="10" font-weight="600" fill="#1e293b">Epistemic Variance</text>
  <text x="145" y="154" text-anchor="middle" font-size="8" font-family="monospace" fill="#64748b">Var(E[a | o, theta])</text>
  <rect x="55" y="175" width="180" height="42" rx="6" fill="#f1f5f9" />
  <text x="145" y="196" text-anchor="middle" font-size="10" font-weight="600" fill="#1e293b">Predictive Entropy</text>
  <text x="145" y="209" text-anchor="middle" font-size="8" font-family="monospace" fill="#64748b">-sum(p log p)</text>
  <rect x="55" y="235" width="180" height="55" rx="6" fill="#fef3c7" stroke="#fde68a" stroke-width="1" />
  <text x="145" y="258" text-anchor="middle" font-size="10" font-weight="700" fill="#b45309">U(a_t) Metric</text>
  <text x="145" y="274" text-anchor="middle" font-size="8" font-weight="600" fill="#78350f">Total Composite Uncertainty</text>

  <!-- Decision Junction -->
  <line x1="250" y1="192" x2="330" y2="192" stroke="#64748b" stroke-width="1.5" />
  
  <polygon points="400,140 480,192 400,244 320,192" fill="#4f46e5" stroke="#3730a3" stroke-width="1.5" />
  <text x="400" y="188" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">U(a) &lt;= tau_safe?</text>
  <text x="400" y="204" text-anchor="middle" font-size="8" font-weight="500" fill="#e0e7ff">Threshold Gate</text>

  <!-- Green Yes Branch -->
  <line x1="400" y1="140" x2="400" y2="95" stroke="#16a34a" stroke-width="2" />
  <line x1="400" y1="95" x2="540" y2="95" stroke="#16a34a" stroke-width="2" />
  <rect x="425" y="78" width="80" height="20" rx="4" fill="#dcfce7" />
  <text x="465" y="92" text-anchor="middle" font-size="9" font-weight="700" fill="#15803d">YES (Safe)</text>

  <rect x="540" y="60" width="220" height="95" rx="10" fill="#16a34a" />
  <text x="650" y="88" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Autonomous Action Dispatch</text>
  <rect x="555" y="100" width="190" height="40" rx="6" fill="rgba(255,255,255,0.2)" />
  <text x="650" y="120" text-anchor="middle" font-size="10" font-weight="600" fill="#ffffff">Direct Hardware Execution</text>
  <text x="650" y="132" text-anchor="middle" font-size="8" font-weight="400" fill="#f0fdf4">Trajectory stream forwarded to low-level PID</text>

  <!-- Red No Branch -->
  <line x1="400" y1="244" x2="400" y2="285" stroke="#dc2626" stroke-width="2" />
  <line x1="400" y1="285" x2="540" y2="285" stroke="#dc2626" stroke-width="2" />
  <rect x="425" y="275" width="85" height="20" rx="4" fill="#fee2e2" />
  <text x="467" y="289" text-anchor="middle" font-size="9" font-weight="700" fill="#b91c1c">NO (Unsafe)</text>

  <rect x="540" y="225" width="220" height="95" rx="10" fill="#dc2626" />
  <text x="650" y="253" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Abstention &amp; HITL Trigger</text>
  <rect x="555" y="265" width="190" height="40" rx="6" fill="rgba(255,255,255,0.2)" />
  <text x="650" y="285" text-anchor="middle" font-size="10" font-weight="600" fill="#ffffff">Freeze Arm &amp; Alert Tele-op</text>
  <text x="650" y="297" text-anchor="middle" font-size="8" font-weight="400" fill="#fef2f2">Query human expert with provenance reasoning</text>
</svg>`;
}

export function generateMeraProtocolSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 320" width="100%" height="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff;">
  <rect x="10" y="10" width="780" height="300" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
  <text x="400" y="38" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">STANDARDIZED EMPIRICAL BENCHMARK EVALUATION PROTOCOL</text>
  
  <g transform="translate(30, 70)">
    <rect width="160" height="200" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
    <text x="80" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">1. Benchmark Suites</text>
    <rect x="15" y="50" width="130" height="55" rx="6" fill="#f1f5f9" />
    <text x="80" y="75" text-anchor="middle" font-size="10" font-weight="700" fill="#1e293b">CALVIN Suite</text>
    <text x="80" y="92" text-anchor="middle" font-size="8" font-weight="500" fill="#64748b">Long-horizon D-D manipulation</text>
    <rect x="15" y="120" width="130" height="55" rx="6" fill="#f1f5f9" />
    <text x="80" y="145" text-anchor="middle" font-size="10" font-weight="700" fill="#1e293b">LIBERO Suite</text>
    <text x="80" y="162" text-anchor="middle" font-size="8" font-weight="500" fill="#64748b">Spatial &amp; object variations</text>
  </g>

  <line x1="190" y1="170" x2="225" y2="170" stroke="#64748b" stroke-width="1.5" />

  <g transform="translate(225, 70)">
    <rect width="160" height="200" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
    <text x="80" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">2. Baseline Models</text>
    <rect x="15" y="45" width="130" height="30" rx="6" fill="#f8fafc" />
    <text x="80" y="65" text-anchor="middle" font-size="9" font-weight="600" fill="#334155">RT-2 (Brohan et al.)</text>
    <rect x="15" y="82" width="130" height="30" rx="6" fill="#f8fafc" />
    <text x="80" y="102" text-anchor="middle" font-size="9" font-weight="600" fill="#334155">Octo (Octo Team)</text>
    <rect x="15" y="119" width="130" height="30" rx="6" fill="#f8fafc" />
    <text x="80" y="139" text-anchor="middle" font-size="9" font-weight="600" fill="#334155">OpenVLA (Kim et al.)</text>
    <rect x="15" y="156" width="130" height="30" rx="6" fill="#f8fafc" />
    <text x="80" y="176" text-anchor="middle" font-size="9" font-weight="600" fill="#334155">ExpeL (Zhao et al.)</text>
  </g>

  <line x1="385" y1="170" x2="420" y2="170" stroke="#64748b" stroke-width="1.5" />

  <g transform="translate(420, 70)">
    <rect width="165" height="200" rx="10" fill="#4f46e5" />
    <text x="82" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">3. Evaluated Model</text>
    <rect x="15" y="55" width="135" height="110" rx="8" fill="rgba(255,255,255,0.15)" />
    <text x="82" y="85" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff">MERA-VLA</text>
    <text x="82" y="105" text-anchor="middle" font-size="9" font-weight="600" fill="#e0e7ff">+ Memory Retrieval</text>
    <text x="82" y="123" text-anchor="middle" font-size="9" font-weight="600" fill="#e0e7ff">+ Calibrated Uncertainty</text>
    <text x="82" y="141" text-anchor="middle" font-size="9" font-weight="600" fill="#e0e7ff">+ Safe Abstention</text>
  </g>

  <line x1="585" y1="170" x2="620" y2="170" stroke="#64748b" stroke-width="1.5" />

  <g transform="translate(620, 70)">
    <rect width="150" height="200" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
    <text x="75" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">4. Target Metrics</text>
    <rect x="15" y="50" width="120" height="35" rx="6" fill="#f0fdf4" stroke="#86efac" stroke-width="1" />
    <text x="75" y="72" text-anchor="middle" font-size="9" font-weight="700" fill="#15803d">Success Rate (%)</text>
    <rect x="15" y="95" width="120" height="35" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1" />
    <text x="75" y="117" text-anchor="middle" font-size="9" font-weight="700" fill="#0369a1">Avg Episode Length</text>
    <rect x="15" y="140" width="120" height="42" rx="6" fill="#fef3c7" stroke="#fde68a" stroke-width="1" />
    <text x="75" y="160" text-anchor="middle" font-size="9" font-weight="700" fill="#b45309">Calibration (ECE)</text>
    <text x="75" y="174" text-anchor="middle" font-size="7" font-weight="500" fill="#78350f">Lower score is superior</text>
  </g>
</svg>`;
}

export function getSvgForDiagramId(id) {
  switch (id) {
    case 'fig-mera-arch':
      return generateMeraArchitectureSvg();
    case 'fig-mera-retrieval':
      return generateMeraRetrievalSvg();
    case 'fig-mera-uncertainty':
      return generateMeraUncertaintySvg();
    case 'fig-mera-protocol':
      return generateMeraProtocolSvg();
    default:
      return generateMeraArchitectureSvg();
  }
}

export default {
  DIAGRAM_TYPES,
  getSvgForDiagramId,
  generateMeraArchitectureSvg,
  generateMeraRetrievalSvg,
  generateMeraUncertaintySvg,
  generateMeraProtocolSvg,
};
