/**
 * DOCUMIND-AI Shared Utilities
 * Business logic, scientific readiness scoring, date formatting, and helpers
 * Shared across Web workstation and Mobile companion
 */

/**
 * Calculates scientific research readiness score (0-100%) and 6 pillars
 * Hard gate: zero verified empirical results caps overall readiness at 72%
 */
export const calculateProjectReadiness = (project) => {
  if (!project) {
    return {
      score: 0,
      label: 'Early Concept',
      pillars: {
        literature: 0,
        methodology: 0,
        experiments: 0,
        manuscript: 0,
        integrity: 0,
        reproducibility: 0,
      },
    };
  }

  // 1. Literature pillar (0-100)
  const papersCount = project.paperProfiles?.length || project.documentIds?.length || 0;
  const hasRelatedTable = Boolean(project.relatedWork?.table?.length);
  const litScore = Math.min(100, Math.round((papersCount / 3) * 60 + (hasRelatedTable ? 40 : 0)));

  // 2. Methodology pillar (0-100)
  const hasArch = Boolean(project.methodology?.proposedArchitecture);
  const hasBaselines = (project.baselines?.length || 0) > 0;
  const methScore = Math.min(100, (hasArch ? 60 : 0) + (hasBaselines ? 40 : 0));

  // 3. Experiments pillar (Hard gated: caps without verified results)
  const verifiedCount = (project.userResults || []).filter((r) => r.verified).length;
  const expScore = verifiedCount > 0
    ? Math.min(100, 30 + verifiedCount * 25)
    : (project.userResults?.length ? 25 : 0);

  // 4. Manuscript pillar (0-100)
  const hasDraft = Boolean(project.generatedDraft?.title);
  const sectionsCount = project.generatedDraft?.sections?.length || 0;
  const manuScore = hasDraft ? Math.min(100, 50 + sectionsCount * 10) : 0;

  // 5. Integrity pillar (0-100)
  const gapsCount = project.researchGaps?.length || 0;
  const rqsCount = project.researchQuestions?.length || 0;
  const integrityScore = Math.min(100, Math.round((gapsCount > 0 ? 50 : 0) + (rqsCount > 0 ? 50 : 0)));

  // 6. Reproducibility
  const repScore = verifiedCount > 0 ? 85 : 61;

  // Overall scientific readiness percentage
  const unweighted = Math.round((litScore + methScore + expScore + manuScore + integrityScore) / 5);
  const finalScore = verifiedCount > 0 ? unweighted : Math.min(72, unweighted);

  let label = 'Pre-Experimental Draft';
  if (finalScore >= 90) label = 'Publication Ready';
  else if (finalScore >= 75) label = 'Empirical Draft';
  else if (finalScore >= 50) label = 'Structured Research';

  return {
    score: finalScore,
    label,
    pillars: {
      literature: litScore,
      methodology: methScore,
      experiments: expScore,
      manuscript: manuScore,
      integrity: integrityScore,
      reproducibility: repScore,
    },
  };
};

export const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Recently';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const truncateText = (text, maxLength = 80) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export default {
  calculateProjectReadiness,
  getTimeOfDayGreeting,
  formatRelativeTime,
  formatFileSize,
  truncateText,
};
