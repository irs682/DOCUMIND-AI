/**
 * Backend vector SVG templates for academic conceptual diagrams
 */

function generateMeraArchitectureSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" width="100%" height="100%" style="font-family: -apple-system, sans-serif; background: #ffffff;">
  <rect x="20" y="15" width="860" height="490" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
  <text x="450" y="45" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a">MERA-VLA: SYSTEM ARCHITECTURE &amp; RETRIEVAL FLOW</text>
  <rect x="35" y="32" width="230" height="20" rx="10" fill="#fef3c7" stroke="#fde68a" stroke-width="1" />
  <text x="150" y="46" text-anchor="middle" font-size="9" font-weight="700" fill="#92400e">GENERATED CONCEPTUAL DIAGRAM</text>
  <g transform="translate(45, 80)">
    <rect width="180" height="135" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="90" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">1. Observation Space</text>
    <rect x="15" y="36" width="150" height="26" rx="6" fill="#f1f5f9" />
    <text x="90" y="53" text-anchor="middle" font-size="10" font-weight="600" fill="#1e293b">Visual Stream (o_t)</text>
    <rect x="15" y="68" width="150" height="26" rx="6" fill="#f1f5f9" />
    <text x="90" y="85" text-anchor="middle" font-size="10" font-weight="600" fill="#1e293b">Language Command (l)</text>
    <rect x="15" y="100" width="150" height="26" rx="6" fill="#f1f5f9" />
    <text x="90" y="117" text-anchor="middle" font-size="10" font-weight="600" fill="#1e293b">Proprioceptive State (q_t)</text>
  </g>
  <g transform="translate(265, 80)">
    <rect width="165" height="135" rx="12" fill="#4f46e5" />
    <text x="82" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">2. Multimodal Encoder</text>
    <rect x="15" y="45" width="135" height="34" rx="6" fill="rgba(255,255,255,0.15)" />
    <text x="82" y="66" text-anchor="middle" font-size="10" fill="#ffffff">Vision Transformer</text>
    <rect x="15" y="86" width="135" height="34" rx="6" fill="rgba(255,255,255,0.15)" />
    <text x="82" y="107" text-anchor="middle" font-size="10" fill="#ffffff">Llama Tokenizer</text>
  </g>
  <g transform="translate(470, 95)">
    <rect width="165" height="105" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="82" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">3. Joint Latent Space</text>
    <rect x="15" y="38" width="135" height="50" rx="8" fill="#e0e7ff" />
    <text x="82" y="58" text-anchor="middle" font-size="10" font-weight="700" fill="#3730a3">Fused Token Prefix</text>
  </g>
  <g transform="translate(450, 245)">
    <rect width="205" height="95" rx="12" fill="#0284c7" />
    <text x="102" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">4. Episodic Memory Retrieval</text>
    <rect x="15" y="38" width="175" height="42" rx="6" fill="rgba(255,255,255,0.15)" />
    <text x="102" y="64" text-anchor="middle" font-size="10" font-weight="600" fill="#ffffff">k-NN Trajectory Bank</text>
  </g>
  <g transform="translate(685, 80)">
    <rect width="165" height="135" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <text x="82" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">5. VLA Transformer</text>
    <rect x="15" y="36" width="135" height="36" rx="6" fill="#f1f5f9" />
    <text x="82" y="58" text-anchor="middle" font-size="10" font-weight="700" fill="#1e293b">Autoregressive Planner</text>
    <rect x="15" y="80" width="135" height="42" rx="6" fill="#fef3c7" stroke="#fde68a" />
    <text x="82" y="105" text-anchor="middle" font-size="10" font-weight="700" fill="#b45309">Uncertainty U(a)</text>
  </g>
  <g transform="translate(365, 385)">
    <rect width="170" height="85" rx="10" fill="#16a34a" />
    <text x="85" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Autonomous Execution</text>
    <text x="85" y="55" text-anchor="middle" font-size="10" fill="#f0fdf4">Action Decoder 7-DoF</text>
  </g>
  <g transform="translate(685, 385)">
    <rect width="165" height="85" rx="10" fill="#dc2626" />
    <text x="82" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Safe Abstention / HITL</text>
    <text x="82" y="55" text-anchor="middle" font-size="10" fill="#fef2f2">Supervisor Intervention</text>
  </g>
</svg>`;
}

function generateMeraRetrievalSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 380" width="100%" height="100%" style="font-family: -apple-system, sans-serif; background: #ffffff;">
  <rect x="10" y="10" width="780" height="360" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
  <text x="400" y="38" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">EPISODIC MEMORY RETRIEVAL &amp; CROSS-ATTENTION FUSION</text>
  <rect x="35" y="70" width="180" height="240" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
  <text x="125" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">Query Generation</text>
  <rect x="280" y="70" width="220" height="240" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
  <text x="390" y="95" text-anchor="middle" font-size="11" font-weight="700" fill="#0369a1">Experience Buffer Bank</text>
  <rect x="565" y="70" width="200" height="240" rx="10" fill="#4f46e5" />
  <text x="665" y="98" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Policy Decoder</text>
</svg>`;
}

function generateMeraUncertaintySvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="100%" height="100%" style="font-family: -apple-system, sans-serif; background: #ffffff;">
  <rect x="10" y="10" width="780" height="340" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
  <text x="400" y="38" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">UNCERTAINTY ESTIMATION &amp; SAFE ABSTENTION DECISION TREE</text>
  <rect x="40" y="75" width="210" height="235" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
  <text x="145" y="100" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">Action Distribution</text>
  <rect x="540" y="60" width="220" height="95" rx="10" fill="#16a34a" />
  <text x="650" y="88" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Autonomous Action Dispatch</text>
  <rect x="540" y="225" width="220" height="95" rx="10" fill="#dc2626" />
  <text x="650" y="253" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Abstention &amp; HITL Trigger</text>
</svg>`;
}

function generateMeraProtocolSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 320" width="100%" height="100%" style="font-family: -apple-system, sans-serif; background: #ffffff;">
  <rect x="10" y="10" width="780" height="300" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
  <text x="400" y="38" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a">STANDARDIZED EMPIRICAL BENCHMARK EVALUATION PROTOCOL</text>
  <rect x="30" y="70" width="160" height="200" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
  <text x="110" y="100" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">CALVIN &amp; LIBERO</text>
</svg>`;
}

module.exports = {
  generateMeraArchitectureSvg,
  generateMeraRetrievalSvg,
  generateMeraUncertaintySvg,
  generateMeraProtocolSvg,
};
