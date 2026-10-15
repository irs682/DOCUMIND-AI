/**
 * DOCUMIND-AI Academic Conceptual Diagram SVG Generators
 * 
 * Generates vector graphics for:
 * 1. MERA-VLA System Architecture
 * 2. Episodic Memory Retrieval & Fusion Flow
 * 3. Uncertainty-Aware Action Selection & Safe Abstention Flow
 * 4. Standardized Evaluation & Benchmark Protocol
 * 
 * All diagrams are populated with complete nodes, visible arrows, and ZERO <marker> tags
 * to eliminate html2canvas black triangle rendering artifacts.
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 480" width="100%" height="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff;">
  <rect x="15" y="10" width="890" height="460" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
  <text x="460" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">MERA-VLA: END-TO-END SYSTEM ARCHITECTURE &amp; SAFE RETRIEVAL PIPELINE</text>

  <!-- 1. Observation Inputs -->
  <g transform="translate(30, 60)">
    <rect width="170" height="155" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="85" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">1. Multimodal Inputs</text>
    <rect x="12" y="36" width="146" height="30" rx="6" fill="#e0e7ff" />
    <text x="85" y="55" text-anchor="middle" font-size="9.5" font-weight="600" fill="#3730a3">Multi-View RGB-D (o_t)</text>
    <rect x="12" y="74" width="146" height="30" rx="6" fill="#f1f5f9" />
    <text x="85" y="93" text-anchor="middle" font-size="9.5" font-weight="600" fill="#1e293b">Language Task (l_t)</text>
    <rect x="12" y="112" width="146" height="30" rx="6" fill="#f1f5f9" />
    <text x="85" y="131" text-anchor="middle" font-size="9.5" font-weight="600" fill="#1e293b">Proprioceptive State (q_t)</text>
  </g>

  <!-- Arrow 1 -> 2 -->
  <line x1="200" y1="135" x2="228" y2="135" stroke="#475569" stroke-width="1.8" />
  <polygon points="228,131 235,135 228,139" fill="#475569" />

  <!-- 2. Multimodal Encoder -->
  <g transform="translate(235, 60)">
    <rect width="160" height="155" rx="10" fill="#4f46e5" />
    <text x="80" y="25" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">2. Multimodal Encoder</text>
    <rect x="12" y="38" width="136" height="45" rx="6" fill="rgba(255,255,255,0.18)" />
    <text x="80" y="57" text-anchor="middle" font-size="9.5" font-weight="600" fill="#ffffff">Vision Transformer</text>
    <text x="80" y="72" text-anchor="middle" font-size="8" fill="#e0e7ff">Patch Tokens (v_1..v_n)</text>
    <rect x="12" y="92" width="136" height="45" rx="6" fill="rgba(255,255,255,0.18)" />
    <text x="80" y="111" text-anchor="middle" font-size="9.5" font-weight="600" fill="#ffffff">Text Tokenizer</text>
    <text x="80" y="126" text-anchor="middle" font-size="8" fill="#e0e7ff">Instruction Prefix Embedding</text>
  </g>

  <!-- Arrow 2 -> 3 -->
  <line x1="395" y1="135" x2="423" y2="135" stroke="#475569" stroke-width="1.8" />
  <polygon points="423,131 430,135 423,139" fill="#475569" />

  <!-- 3. Joint Latent Representation -->
  <g transform="translate(430, 80)">
    <rect width="155" height="115" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="77" y="24" text-anchor="middle" font-size="10.5" font-weight="700" fill="#334155">3. State Prefix (z_t)</text>
    <rect x="12" y="38" width="131" height="60" rx="6" fill="#eef2ff" stroke="#c7d2fe" />
    <text x="77" y="60" text-anchor="middle" font-size="9.5" font-weight="700" fill="#3730a3">Fused Token Stream</text>
    <text x="77" y="78" text-anchor="middle" font-size="8" fill="#4338ca">z_t = [v_t; l_t; q_t]</text>
  </g>

  <!-- Downward arrow to Episodic Memory -->
  <line x1="507" y1="195" x2="507" y2="238" stroke="#0284c7" stroke-width="1.8" />
  <polygon points="503,238 507,245 511,238" fill="#0284c7" />

  <!-- 4. Episodic Memory Retrieval Buffer -->
  <g transform="translate(370, 245)">
    <rect width="275" height="95" rx="10" fill="#0284c7" />
    <text x="137" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">4. Episodic Memory Buffer (M)</text>
    <rect x="15" y="36" width="245" height="46" rx="6" fill="rgba(255,255,255,0.18)" />
    <text x="137" y="54" text-anchor="middle" font-size="9.5" font-weight="600" fill="#ffffff">k-NN Trajectory Store (Key-Value)</text>
    <text x="137" y="70" text-anchor="middle" font-size="8.5" fill="#e0f2fe">Cosine Sim Match: Top-k Trajectories M_ret</text>
  </g>

  <!-- Arrow from Joint Latent & Memory -> Policy Decoder -->
  <line x1="585" y1="135" x2="618" y2="135" stroke="#475569" stroke-width="1.8" />
  <polygon points="618,131 625,135 618,139" fill="#475569" />

  <path d="M 645 292 L 705 292 L 705 226" stroke="#0284c7" stroke-width="1.8" fill="none" />
  <polygon points="701,226 705,219 709,226" fill="#0284c7" />

  <!-- 5. VLA Transformer & Action Planning -->
  <g transform="translate(625, 60)">
    <rect width="165" height="155" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="82" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">5. Policy Decoder</text>
    <rect x="12" y="36" width="141" height="45" rx="6" fill="#f1f5f9" />
    <text x="82" y="55" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1e293b">Cross-Attention</text>
    <text x="82" y="70" text-anchor="middle" font-size="8" fill="#475569">Conditioned on M_ret</text>
    <rect x="12" y="90" width="141" height="48" rx="6" fill="#fef3c7" stroke="#fde68a" />
    <text x="82" y="109" text-anchor="middle" font-size="9.5" font-weight="700" fill="#92400e">Uncertainty U(a_t)</text>
    <text x="82" y="125" text-anchor="middle" font-size="8" fill="#b45309">Entropy + Dispersion</text>
  </g>

  <!-- Decision Branches -->
  <path d="M 707 215 L 707 360 L 542 360" stroke="#16a34a" stroke-width="2" fill="none" />
  <polygon points="542,356 535,360 542,364" fill="#16a34a" />

  <path d="M 707 215 L 707 360 L 728 360" stroke="#dc2626" stroke-width="2" fill="none" />
  <polygon points="728,356 735,360 728,364" fill="#dc2626" />

  <!-- Safe Execution Output -->
  <g transform="translate(340, 375)">
    <rect width="190" height="75" rx="8" fill="#16a34a" />
    <text x="95" y="24" text-anchor="middle" font-size="10.5" font-weight="700" fill="#ffffff">Autonomous Execution</text>
    <text x="95" y="42" text-anchor="middle" font-size="9" font-weight="500" fill="#dcfce7">U(a_t) &lt;= tau_safe</text>
    <text x="95" y="60" text-anchor="middle" font-size="8.5" font-weight="600" fill="#ffffff">Dispatched 7-DoF Robot Control</text>
  </g>

  <!-- Safe Abstention Output -->
  <g transform="translate(685, 375)">
    <rect width="190" height="75" rx="8" fill="#dc2626" />
    <text x="95" y="24" text-anchor="middle" font-size="10.5" font-weight="700" fill="#ffffff">Safe Abstention / HITL</text>
    <text x="95" y="42" text-anchor="middle" font-size="9" font-weight="500" fill="#fee2e2">U(a_t) &gt; tau_safe</text>
    <text x="95" y="60" text-anchor="middle" font-size="8.5" font-weight="600" fill="#ffffff">Halt Execution &amp; Request Tele-op</text>
  </g>
</svg>`;
}

export function generateMeraRetrievalSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 390" width="100%" height="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff;">
  <rect x="10" y="10" width="860" height="370" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
  <text x="440" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">EPISODIC MEMORY RETRIEVAL &amp; CROSS-ATTENTION FUSION ARCHITECTURE</text>

  <!-- Column 1: Query State & Encoder -->
  <g transform="translate(30, 65)">
    <rect width="180" height="280" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="90" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">1. Query State &amp; Encoder</text>
    <rect x="15" y="42" width="150" height="44" rx="6" fill="#e0e7ff" />
    <text x="90" y="62" text-anchor="middle" font-size="9.5" font-weight="600" fill="#3730a3">Observation o_t</text>
    <text x="90" y="76" text-anchor="middle" font-size="8" fill="#4338ca">RGB-D + Language l_t</text>
    <rect x="15" y="98" width="150" height="44" rx="6" fill="#f1f5f9" />
    <text x="90" y="118" text-anchor="middle" font-size="9.5" font-weight="600" fill="#1e293b">State Encoder phi(q_t)</text>
    <text x="90" y="132" text-anchor="middle" font-size="8" fill="#475569">Normalized Projection</text>
    <rect x="15" y="154" width="150" height="48" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="3,3" />
    <text x="90" y="174" text-anchor="middle" font-size="9" font-weight="700" fill="#0f172a">Query Vector q_t</text>
    <text x="90" y="190" text-anchor="middle" font-size="8" fill="#64748b">Latent Query Key</text>
    <rect x="15" y="214" width="150" height="48" rx="6" fill="#f0f9ff" />
    <text x="90" y="234" text-anchor="middle" font-size="8.5" font-weight="600" fill="#0284c7">Cosine Sim Formula</text>
    <text x="90" y="250" text-anchor="middle" font-size="7.5" font-family="monospace" fill="#0369a1">dot(phi(q), psi(m))</text>
  </g>

  <!-- Arrow 1 -> 2 -->
  <line x1="210" y1="180" x2="243" y2="180" stroke="#475569" stroke-width="1.8" />
  <polygon points="243,176 250,180 243,184" fill="#475569" />

  <!-- Column 2: Memory Bank & Top-k Retrieval -->
  <g transform="translate(250, 65)">
    <rect width="210" height="280" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="105" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#0369a1">2. Episodic Memory Bank</text>
    <rect x="15" y="42" width="180" height="38" rx="6" fill="#f0f9ff" stroke="#bae6fd" />
    <text x="105" y="58" text-anchor="middle" font-size="9" font-weight="700" fill="#0369a1">Episode 1 (Rank 1)</text>
    <text x="105" y="71" text-anchor="middle" font-size="8" fill="#0284c7">Sim: 0.94 • Trajectories [1..T]</text>
    <rect x="15" y="88" width="180" height="38" rx="6" fill="#f0f9ff" stroke="#bae6fd" />
    <text x="105" y="104" text-anchor="middle" font-size="9" font-weight="700" fill="#0369a1">Episode 2 (Rank 2)</text>
    <text x="105" y="117" text-anchor="middle" font-size="8" fill="#0284c7">Sim: 0.88 • Trajectories [1..T]</text>
    <rect x="15" y="134" width="180" height="38" rx="6" fill="#f0f9ff" stroke="#bae6fd" />
    <text x="105" y="150" text-anchor="middle" font-size="9" font-weight="700" fill="#0369a1">Episode 3 (Rank 3)</text>
    <text x="105" y="163" text-anchor="middle" font-size="8" fill="#0284c7">Sim: 0.82 • Trajectories [1..T]</text>
    <rect x="15" y="180" width="180" height="38" rx="6" fill="#f1f5f9" />
    <text x="105" y="196" text-anchor="middle" font-size="8.5" font-weight="500" fill="#475569">Historical Episodes (N=5000)</text>
    <text x="105" y="209" text-anchor="middle" font-size="7.5" fill="#64748b">Key-Value Trajectory Buffer</text>
    <rect x="15" y="226" width="180" height="36" rx="6" fill="#0284c7" />
    <text x="105" y="248" text-anchor="middle" font-size="9" font-weight="700" fill="#ffffff">Top-k Retrieved Trajectories (M_ret)</text>
  </g>

  <!-- Arrow 2 -> 3 -->
  <line x1="460" y1="180" x2="493" y2="180" stroke="#0284c7" stroke-width="1.8" />
  <polygon points="493,176 500,180 493,184" fill="#0284c7" />

  <!-- Column 3: Cross-Attention Fusion & Policy Decoder -->
  <g transform="translate(500, 65)">
    <rect width="210" height="280" rx="10" fill="#4f46e5" />
    <text x="105" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">3. Cross-Attention Fusion</text>
    <rect x="15" y="42" width="180" height="52" rx="6" fill="rgba(255,255,255,0.18)" />
    <text x="105" y="63" text-anchor="middle" font-size="9.5" font-weight="600" fill="#ffffff">Multi-Head Cross-Attention</text>
    <text x="105" y="78" text-anchor="middle" font-size="8" fill="#e0e7ff">Query: z_t | Keys/Values: M_ret</text>
    <rect x="15" y="104" width="180" height="50" rx="6" fill="rgba(255,255,255,0.18)" />
    <text x="105" y="125" text-anchor="middle" font-size="9.5" font-weight="600" fill="#ffffff">Feed-Forward Transformer</text>
    <text x="105" y="140" text-anchor="middle" font-size="8" fill="#e0e7ff">Temporal Action Context Block</text>
    <rect x="15" y="164" width="180" height="48" rx="6" fill="rgba(255,255,255,0.18)" />
    <text x="105" y="185" text-anchor="middle" font-size="9.5" font-weight="600" fill="#ffffff">Policy Decoder</text>
    <text x="105" y="200" text-anchor="middle" font-size="8" fill="#e0e7ff">Softmax Action Distribution</text>
    <rect x="15" y="222" width="180" height="42" rx="6" fill="#15803d" />
    <text x="105" y="247" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff">Conditioned Action a_t</text>
  </g>

  <!-- Column 4: Summary Output Legend -->
  <g transform="translate(730, 65)">
    <rect width="120" height="280" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="60" y="26" text-anchor="middle" font-size="10" font-weight="700" fill="#334155">Output Specification</text>
    <rect x="10" y="44" width="100" height="40" rx="4" fill="#f8fafc" />
    <text x="55" y="62" text-anchor="middle" font-size="8" font-weight="700" fill="#0f172a">Action Space</text>
    <text x="55" y="74" text-anchor="middle" font-size="7.5" fill="#64748b">7-DoF Joint Velocities</text>
    <rect x="10" y="94" width="100" height="40" rx="4" fill="#f8fafc" />
    <text x="55" y="112" text-anchor="middle" font-size="8" font-weight="700" fill="#0f172a">Top-k Budget</text>
    <text x="55" y="124" text-anchor="middle" font-size="7.5" fill="#64748b">k = 5 Trajectories</text>
    <rect x="10" y="144" width="100" height="40" rx="4" fill="#f8fafc" />
    <text x="55" y="162" text-anchor="middle" font-size="8" font-weight="700" fill="#0f172a">Latency</text>
    <text x="55" y="174" text-anchor="middle" font-size="7.5" fill="#64748b">&lt; 35 ms Retrieval</text>
    <rect x="10" y="194" width="100" height="56" rx="4" fill="#dcfce7" stroke="#86efac" />
    <text x="55" y="215" text-anchor="middle" font-size="8" font-weight="700" fill="#166534">Provenanced</text>
    <text x="55" y="230" text-anchor="middle" font-size="7" fill="#15803d">Traceable to</text>
    <text x="55" y="242" text-anchor="middle" font-size="7" fill="#15803d">Source Buffer</text>
  </g>
</svg>`;
}

export function generateMeraUncertaintySvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 390" width="100%" height="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff;">
  <rect x="10" y="10" width="860" height="370" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
  <text x="440" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">DUAL-DISPERSION UNCERTAINTY ESTIMATION &amp; SAFE ABSTENTION DECISION TREE</text>

  <!-- 1. Policy Action Distribution -->
  <g transform="translate(30, 65)">
    <rect width="210" height="280" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="105" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">1. Action Distribution</text>
    <rect x="15" y="42" width="180" height="46" rx="6" fill="#f1f5f9" />
    <text x="105" y="62" text-anchor="middle" font-size="9.5" font-weight="600" fill="#1e293b">Predictive Entropy</text>
    <text x="105" y="77" text-anchor="middle" font-size="8" font-family="monospace" fill="#475569">H(p) = -sum(p log p)</text>
    <rect x="15" y="100" width="180" height="46" rx="6" fill="#f1f5f9" />
    <text x="105" y="120" text-anchor="middle" font-size="9.5" font-weight="600" fill="#1e293b">Ensemble Dispersion</text>
    <text x="105" y="135" text-anchor="middle" font-size="8" font-family="monospace" fill="#475569">Var_theta(E[a | o, theta])</text>
    <rect x="15" y="158" width="180" height="50" rx="6" fill="#fef3c7" stroke="#fde68a" />
    <text x="105" y="179" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e">Uncertainty Estimator U(a_t)</text>
    <text x="105" y="195" text-anchor="middle" font-size="8" fill="#b45309">U(a_t) = H(p) + beta * Var_theta</text>
    <rect x="15" y="218" width="180" height="46" rx="6" fill="#f8fafc" />
    <text x="105" y="238" text-anchor="middle" font-size="8.5" font-weight="600" fill="#475569">Calibration State</text>
    <text x="105" y="252" text-anchor="middle" font-size="7.5" fill="#64748b">Candidate Threshold: tau_safe</text>
  </g>

  <!-- Arrow to Threshold Gate -->
  <line x1="240" y1="205" x2="303" y2="205" stroke="#475569" stroke-width="1.8" />
  <polygon points="303,201 310,205 303,209" fill="#475569" />

  <!-- 2. Calibrated Decision Threshold Gate (Diamond) -->
  <g transform="translate(310, 130)">
    <polygon points="100,0 200,75 100,150 0,75" fill="#4f46e5" stroke="#3730a3" stroke-width="1.5" />
    <text x="100" y="68" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">U(a_t) &lt;= tau_safe?</text>
    <text x="100" y="86" text-anchor="middle" font-size="8.5" font-weight="500" fill="#e0e7ff">Calibrated Threshold</text>
  </g>

  <!-- Green YES branch (Up and Right to Autonomous Dispatch) -->
  <path d="M 410 130 L 410 95 L 533 95" stroke="#16a34a" stroke-width="2.2" fill="none" />
  <polygon points="533,91 540,95 533,99" fill="#16a34a" />
  <rect x="430" y="78" width="75" height="22" rx="4" fill="#dcfce7" stroke="#86efac" />
  <text x="467" y="93" text-anchor="middle" font-size="9.5" font-weight="700" fill="#15803d">YES (Safe)</text>

  <!-- Green Execution Block -->
  <g transform="translate(540, 50)">
    <rect width="300" height="110" rx="10" fill="#16a34a" />
    <text x="150" y="28" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">Execute Direct Action</text>
    <rect x="15" y="40" width="270" height="55" rx="6" fill="rgba(255,255,255,0.2)" />
    <text x="150" y="60" text-anchor="middle" font-size="10" font-weight="600" fill="#ffffff">Direct Hardware Execution</text>
    <text x="150" y="75" text-anchor="middle" font-size="8.5" fill="#f0fdf4">Trajectory sent to continuous PID controller</text>
    <text x="150" y="88" text-anchor="middle" font-size="7.5" fill="#dcfce7">Execution Latency: &lt; 50 ms</text>
  </g>

  <!-- Red NO branch (Down and Right to Safe Abstention) -->
  <path d="M 410 280 L 410 300 L 533 300" stroke="#dc2626" stroke-width="2.2" fill="none" />
  <polygon points="533,296 540,300 533,304" fill="#dc2626" />
  <rect x="430" y="283" width="75" height="22" rx="4" fill="#fee2e2" stroke="#fca5a5" />
  <text x="467" y="298" text-anchor="middle" font-size="9.5" font-weight="700" fill="#b91c1c">NO (Unsafe)</text>

  <!-- Red Abstention Block -->
  <g transform="translate(540, 235)">
    <rect width="300" height="120" rx="10" fill="#dc2626" />
    <text x="150" y="28" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">Safe Abstain / HITL Fallback</text>
    <rect x="15" y="40" width="270" height="65" rx="6" fill="rgba(255,255,255,0.2)" />
    <text x="150" y="60" text-anchor="middle" font-size="10" font-weight="600" fill="#ffffff">Freeze Arm &amp; Alert Tele-Operator</text>
    <text x="150" y="75" text-anchor="middle" font-size="8.5" fill="#fef2f2">Query human expert with provenance rationale</text>
    <text x="150" y="89" text-anchor="middle" font-size="7.5" fill="#fee2e2">Fail-Safe State: Motor brakes engaged</text>
  </g>
</svg>`;
}

export function generateMeraProtocolSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 340" width="100%" height="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff;">
  <rect x="10" y="10" width="860" height="320" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
  <text x="440" y="36" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">STANDARDIZED EMPIRICAL BENCHMARK EVALUATION PROTOCOL (PLANNED)</text>

  <!-- 1. Benchmark Testbeds -->
  <g transform="translate(30, 60)">
    <rect width="180" height="235" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="90" y="26" text-anchor="middle" font-size="10.5" font-weight="700" fill="#334155">1. Benchmark Testbeds</text>
    <rect x="12" y="42" width="156" height="56" rx="6" fill="#f1f5f9" />
    <text x="90" y="62" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1e293b">CALVIN Suite</text>
    <text x="90" y="78" text-anchor="middle" font-size="8" fill="#475569">ABC -&gt; D Split • Multi-Task</text>
    <text x="90" y="90" text-anchor="middle" font-size="7.5" fill="#64748b">Long-Horizon Manipulation</text>
    <rect x="12" y="108" width="156" height="56" rx="6" fill="#f1f5f9" />
    <text x="90" y="128" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1e293b">LIBERO Suite</text>
    <text x="90" y="144" text-anchor="middle" font-size="8" fill="#475569">Spatial &amp; Object Generalization</text>
    <text x="90" y="156" text-anchor="middle" font-size="7.5" fill="#64748b">500 Simulation Rollouts</text>
    <rect x="12" y="174" width="156" height="42" rx="6" fill="#e0f2fe" />
    <text x="90" y="194" text-anchor="middle" font-size="8.5" font-weight="600" fill="#0369a1">Observation Budget</text>
    <text x="90" y="206" text-anchor="middle" font-size="7.5" fill="#0284c7">Static + Gripper RGB-D</text>
  </g>

  <!-- Arrow 1 -> 2 -->
  <line x1="210" y1="175" x2="238" y2="175" stroke="#475569" stroke-width="1.8" />
  <polygon points="238,171 245,175 238,179" fill="#475569" />

  <!-- 2. Comparative Baselines -->
  <g transform="translate(245, 60)">
    <rect width="180" height="235" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="90" y="26" text-anchor="middle" font-size="10.5" font-weight="700" fill="#334155">2. Comparative Baselines</text>
    <rect x="12" y="42" width="156" height="40" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
    <text x="90" y="60" text-anchor="middle" font-size="9" font-weight="600" fill="#334155">Standard VLA (No Memory)</text>
    <text x="90" y="73" text-anchor="middle" font-size="7.5" fill="#64748b">Direct Open-Loop Imitation</text>
    <rect x="12" y="90" width="156" height="40" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
    <text x="90" y="108" text-anchor="middle" font-size="9" font-weight="600" fill="#334155">ExpeL Foundation [1]</text>
    <text x="90" y="121" text-anchor="middle" font-size="7.5" fill="#64748b">Text Experiential Insights</text>
    <rect x="12" y="138" width="156" height="40" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
    <text x="90" y="156" text-anchor="middle" font-size="9" font-weight="600" fill="#334155">OpenVLA Backbone</text>
    <text x="90" y="169" text-anchor="middle" font-size="7.5" fill="#64748b">General Foundation Policy</text>
    <rect x="12" y="186" width="156" height="35" rx="6" fill="#fef3c7" stroke="#fde68a" />
    <text x="90" y="206" text-anchor="middle" font-size="8" font-weight="700" fill="#92400e">Uncalibrated Baselines</text>
  </g>

  <!-- Arrow 2 -> 3 -->
  <line x1="425" y1="175" x2="453" y2="175" stroke="#475569" stroke-width="1.8" />
  <polygon points="453,171 460,175 453,179" fill="#475569" />

  <!-- 3. Proposed MERA-VLA System -->
  <g transform="translate(460, 60)">
    <rect width="180" height="235" rx="10" fill="#4f46e5" />
    <text x="90" y="26" text-anchor="middle" font-size="10.5" font-weight="700" fill="#ffffff">3. Proposed System</text>
    <rect x="12" y="42" width="156" height="175" rx="6" fill="rgba(255,255,255,0.18)" />
    <text x="90" y="68" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff">MERA-VLA</text>
    <text x="90" y="86" text-anchor="middle" font-size="8.5" font-weight="600" fill="#e0e7ff">+ Key-Value Buffer</text>
    <text x="90" y="104" text-anchor="middle" font-size="8.5" font-weight="600" fill="#e0e7ff">+ Cosine Retrieval</text>
    <text x="90" y="122" text-anchor="middle" font-size="8.5" font-weight="600" fill="#e0e7ff">+ Entropy Calibration</text>
    <text x="90" y="140" text-anchor="middle" font-size="8.5" font-weight="600" fill="#e0e7ff">+ Safe Abstention Gating</text>
    <text x="90" y="158" text-anchor="middle" font-size="8.5" font-weight="600" fill="#e0e7ff">+ Provenance Auditing</text>
    <rect x="20" y="172" width="140" height="34" rx="4" fill="#ffffff" />
    <text x="90" y="192" text-anchor="middle" font-size="8.5" font-weight="700" fill="#4338ca">Proposed Target</text>
  </g>

  <!-- Arrow 3 -> 4 -->
  <line x1="640" y1="175" x2="668" y2="175" stroke="#475569" stroke-width="1.8" />
  <polygon points="668,171 675,175 668,179" fill="#475569" />

  <!-- 4. Planned Evaluation Metrics & Statistics -->
  <g transform="translate(675, 60)">
    <rect width="170" height="235" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="85" y="26" text-anchor="middle" font-size="10.5" font-weight="700" fill="#334155">4. Target Metrics (Planned)</text>
    <rect x="12" y="40" width="146" height="40" rx="6" fill="#f0fdf4" stroke="#86efac" />
    <text x="85" y="58" text-anchor="middle" font-size="9" font-weight="700" fill="#15803d">Success Rate (SR %)</text>
    <text x="85" y="71" text-anchor="middle" font-size="7.5" fill="#166534">500 Rollouts per Benchmark</text>
    <rect x="12" y="86" width="146" height="40" rx="6" fill="#fef3c7" stroke="#fde68a" />
    <text x="85" y="104" text-anchor="middle" font-size="9" font-weight="700" fill="#b45309">Calibration (ECE)</text>
    <text x="85" y="117" text-anchor="middle" font-size="7.5" fill="#78350f">Expected Calibration Error</text>
    <rect x="12" y="132" width="146" height="40" rx="6" fill="#f0f9ff" stroke="#bae6fd" />
    <text x="85" y="150" text-anchor="middle" font-size="9" font-weight="700" fill="#0369a1">Risk-Coverage (AURC)</text>
    <text x="85" y="163" text-anchor="middle" font-size="7.5" fill="#0284c7">Safe Abstention Curve</text>
    <rect x="12" y="178" width="146" height="48" rx="6" fill="#f8fafc" />
    <text x="85" y="196" text-anchor="middle" font-size="8.5" font-weight="700" fill="#0f172a">Statistical Protocol</text>
    <text x="85" y="209" text-anchor="middle" font-size="7.5" fill="#64748b">5 Seeds • p &lt; 0.05</text>
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
