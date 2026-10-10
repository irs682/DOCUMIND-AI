/**
 * Automatic Document Classification Service (SRS Section 15, 43, 55 Phase 3)
 * Classifies document text and filenames into SRS-defined categories with confidence scores.
 * Categories:
 * - Research Paper, Contract, Invoice, Resume, Report, Policy, Technical Manual,
 *   Financial Document, Legal Document, Other
 */

const { callOpenRouter, getFastModel } = require('./llmService');

const CATEGORY_RULES = [
  {
    category: 'Research Paper',
    keywords: [
      'abstract', 'methodology', 'references', 'literature review', 'dataset',
      'experiments', 'arxiv', 'doi', 'results and discussion', 'citations', 'authors',
    ],
    filenamePatterns: [/paper/i, /study/i, /arxiv/i, /ieee/i, /research/i, /journal/i],
    weight: 1.2,
  },
  {
    category: 'Contract',
    keywords: [
      'agreement', 'terms and conditions', 'parties hereby', 'covenants', 'indemnification',
      'breach of contract', 'governing law', 'in witness whereof', 'confidentiality agreement',
    ],
    filenamePatterns: [/contract/i, /agreement/i, /nda/i, /sla/i, /mou/i, /terms/i],
    weight: 1.2,
  },
  {
    category: 'Invoice',
    keywords: [
      'invoice', 'bill to', 'subtotal', 'total due', 'amount due', 'tax rate',
      'payment terms', 'invoice number', 'po number', 'remittance',
    ],
    filenamePatterns: [/invoice/i, /bill/i, /receipt/i, /statement/i],
    weight: 1.4,
  },
  {
    category: 'Resume',
    keywords: [
      'curriculum vitae', 'resume', 'work experience', 'education', 'skills',
      'professional summary', 'certifications', 'employment history', 'contact information',
    ],
    filenamePatterns: [/resume/i, /cv/i, /bio/i, /profile/i],
    weight: 1.3,
  },
  {
    category: 'Financial Document',
    keywords: [
      'balance sheet', 'income statement', 'cash flows', 'fiscal year', 'ebitda',
      'gross margin', 'quarterly revenue', 'assets and liabilities', 'audit opinion',
    ],
    filenamePatterns: [/financial/i, /10-k/i, /10-q/i, /earnings/i, /balance.*sheet/i],
    weight: 1.2,
  },
  {
    category: 'Policy',
    keywords: [
      'policy', 'compliance', 'code of conduct', 'guidelines', 'data protection',
      'security policy', 'acceptable use', 'procedures', 'safeguards',
    ],
    filenamePatterns: [/policy/i, /guideline/i, /procedure/i, /compliance/i],
    weight: 1.1,
  },
  {
    category: 'Technical Manual',
    keywords: [
      'user guide', 'manual', 'installation guide', 'architecture overview',
      'configuration', 'specifications', 'troubleshooting', 'developer guide', 'api reference',
    ],
    filenamePatterns: [/manual/i, /guide/i, /spec/i, /architecture/i, /handbook/i, /docs/i],
    weight: 1.1,
  },
  {
    category: 'Legal Document',
    keywords: [
      'court', 'plaintiff', 'defendant', 'affidavit', 'statute', 'jurisdiction',
      'hereby', 'attorney at law', 'arbitration', 'legal notice',
    ],
    filenamePatterns: [/legal/i, /notice/i, /court/i, /claim/i, /affidavit/i],
    weight: 1.2,
  },
  {
    category: 'Report',
    keywords: [
      'executive summary', 'annual report', 'progress report', 'status report',
      'overview', 'key findings', 'performance report', 'investigation report',
    ],
    filenamePatterns: [/report/i, /summary/i, /overview/i, /brief/i],
    weight: 1.0,
  },
];

/**
 * Fast heuristic classification based on content and filename scoring.
 */
const classifyWithHeuristics = (text = '', filename = '') => {
  const sample = (text || '').slice(0, 8000).toLowerCase();
  const name = (filename || '').toLowerCase();

  let bestCategory = 'Other';
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;

    // Check filename matches
    for (const pat of rule.filenamePatterns) {
      if (pat.test(name)) {
        score += 3.5;
        break;
      }
    }

    // Check keyword frequency
    for (const kw of rule.keywords) {
      if (sample.includes(kw)) {
        score += 1.2;
      }
    }

    score *= rule.weight;

    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
    }
  }

  // Calculate normalized confidence score (e.g. 0.82 to 0.98)
  let confidence = 0.85;
  if (bestScore > 6) {
    confidence = Math.min(0.98, 0.88 + bestScore * 0.015);
  } else if (bestScore > 2) {
    confidence = 0.82 + bestScore * 0.02;
  } else {
    confidence = 0.70;
    bestCategory = 'Other';
  }

  return {
    category: bestCategory,
    confidence: Number(confidence.toFixed(2)),
  };
};

/**
 * Automatic Document Classification Engine
 * Returns: { category, confidence }
 */
const classifyDocument = async (text = '', filename = '') => {
  // First run fast heuristic classification
  const heuristic = classifyWithHeuristics(text, filename);

  // If high confidence or no API key, return immediately
  if (heuristic.confidence >= 0.90 || !process.env.OPENROUTER_API_KEY) {
    return heuristic;
  }

  // Otherwise, run fast LLM intent classification for ambiguous text
  try {
    const prompt = `Classify the following document into EXACTLY ONE of these categories:
- Research Paper
- Contract
- Invoice
- Resume
- Report
- Policy
- Technical Manual
- Financial Document
- Legal Document
- Other

Filename: ${filename}
Excerpt:
${text.slice(0, 1500)}

Respond strictly in JSON format with:
{"category": "<Category>", "confidence": <float between 0.7 and 0.99>}`;

    const model = getFastModel();
    const res = await callOpenRouter({
      messages: [{ role: 'user', content: prompt }],
      model,
      temperature: 0.0,
      maxTokens: 100,
      task: 'document_classification',
    });

    const rawText = typeof res === 'string' ? res : (res?.text || '');
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.category && CATEGORY_RULES.some((r) => r.category === parsed.category)) {
        return {
          category: parsed.category,
          confidence: Number(parsed.confidence || 0.95),
        };
      }
    }
  } catch (err) {
    console.warn('[Classification Fallback]:', err.message);
  }

  return heuristic;
};

module.exports = { classifyDocument, classifyWithHeuristics };
