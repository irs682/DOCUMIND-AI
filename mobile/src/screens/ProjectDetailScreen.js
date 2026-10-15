import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Share,
} from 'react-native';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Share2,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../../../packages/api-client/index.js';
import { calculateProjectReadiness } from '../../../packages/utilities/index.js';
import ResearchReadinessMeter from '../components/ResearchReadinessMeter';
import { cacheManuscript } from '../services/offlineCache';

const STEP_LABELS = [
  '',
  'Step 1 — Add Papers',
  'Step 2 — Research Goal',
  'Step 3 — Related Work',
  'Step 4 — Comparison Matrix',
  'Step 5 — Research Gaps',
  'Step 6 — Questions & Hypotheses',
  'Step 7 — Methodology',
  'Step 8 — Benchmarks & Baselines',
  'Step 9 — Results & Gains',
  'Step 10 — Discussion & Analysis',
  'Step 11 — Paper Draft',
];

export const ProjectDetailScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [expandedSections, setExpandedSections] = useState({
    pillars: true,
    literature: false,
    methodology: false,
    experiments: false,
    manuscript: false,
    integrity: false,
  });

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.projects.get(projectId);
      const proj = res.data?.project || res.project || res;
      setProject(proj);
      setActiveStep(proj?.currentStep || 1);
      if (proj?.generatedDraft) {
        await cacheManuscript(projectId, proj.generatedDraft);
      }
    } catch (err) {
      console.warn('Could not load project detail:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleShare = async () => {
    if (!project) return;
    try {
      await Share.share({
        title: project.title,
        message: `DOCUMIND-AI Research Project: ${project.title}\nTopic: ${project.researchTopic || 'Autonomous Research'}\nCurrent Stage: Step ${project.currentStep || 1}/11`,
      });
    } catch (_) {}
  };

  if (loading || !project) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={[styles.loadingText, { color: currentColors.textSecondary }]}>Loading research study...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const readiness = calculateProjectReadiness(project);
  const papers = project.paperProfiles || [];
  const gaps = project.researchGaps || [];
  const rqs = project.researchQuestions || [];
  const baselines = project.baselines || [];
  const results = project.userResults || [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      {/* Top Navbar */}
      <View style={[styles.navBar, { borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={currentColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: currentColors.textPrimary }]} numberOfLines={1}>
          {project.title}
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.backBtn}>
          <Share2 size={18} color={currentColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Project Header Banner */}
        <View style={[styles.headerCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
          <Text style={[styles.projectTitle, { color: currentColors.textPrimary }]}>{project.title}</Text>
          <Text style={[styles.projectTopic, { color: currentColors.textSecondary }]}>
            {project.researchTopic || 'Autonomous Research & Synthesis'}
          </Text>

          {/* Scientific Readiness Ring & Pillars */}
          <View style={styles.readinessWrap}>
            <ResearchReadinessMeter score={readiness.score} label={readiness.label} />
          </View>

          {/* 5 Scientific Pillars Breakdown */}
          <TouchableOpacity
            style={[styles.pillarsToggle, { borderTopColor: currentColors.border }]}
            onPress={() => toggleSection('pillars')}
          >
            <Text style={[styles.pillarsToggleText, { color: currentColors.textSecondary }]}>
              Scientific Pillar Breakdown
            </Text>
            {expandedSections.pillars ? (
              <ChevronUp size={16} color={currentColors.textSecondary} />
            ) : (
              <ChevronDown size={16} color={currentColors.textSecondary} />
            )}
          </TouchableOpacity>

          {expandedSections.pillars && (
            <View style={styles.pillarsGrid}>
              <View style={[styles.pillarItem, { backgroundColor: currentColors.canvas }]}>
                <Text style={[styles.pillarLabel, { color: currentColors.textSecondary }]}>Literature</Text>
                <Text style={[styles.pillarVal, { color: tokens.colors.primary[500] }]}>{readiness.pillars.literature}%</Text>
              </View>
              <View style={[styles.pillarItem, { backgroundColor: currentColors.canvas }]}>
                <Text style={[styles.pillarLabel, { color: currentColors.textSecondary }]}>Methodology</Text>
                <Text style={[styles.pillarVal, { color: tokens.colors.primary[500] }]}>{readiness.pillars.methodology}%</Text>
              </View>
              <View style={[styles.pillarItem, { backgroundColor: currentColors.canvas }]}>
                <Text style={[styles.pillarLabel, { color: currentColors.textSecondary }]}>Experiments</Text>
                <Text style={[styles.pillarVal, { color: readiness.pillars.experiments > 0 ? tokens.colors.success[500] : tokens.colors.warning[500] }]}>
                  {readiness.pillars.experiments}%
                </Text>
              </View>
              <View style={[styles.pillarItem, { backgroundColor: currentColors.canvas }]}>
                <Text style={[styles.pillarLabel, { color: currentColors.textSecondary }]}>Manuscript</Text>
                <Text style={[styles.pillarVal, { color: tokens.colors.primary[500] }]}>{readiness.pillars.manuscript}%</Text>
              </View>
              <View style={[styles.pillarItem, { backgroundColor: currentColors.canvas }]}>
                <Text style={[styles.pillarLabel, { color: currentColors.textSecondary }]}>Integrity</Text>
                <Text style={[styles.pillarVal, { color: tokens.colors.success[500] }]}>{readiness.pillars.integrity}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── 11-Step Mobile Stepper ─────────────────────────────────────── */}
        <View style={[styles.stepperCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
          <Text style={[styles.stepperSub, { color: currentColors.textSecondary }]}>CURRENT RESEARCH STAGE</Text>
          <Text style={[styles.stepperTitle, { color: currentColors.textPrimary }]}>
            {STEP_LABELS[activeStep] || `Step ${activeStep} of 11`}
          </Text>

          <View style={styles.stepperNav}>
            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: currentColors.border, opacity: activeStep <= 1 ? 0.3 : 1 }]}
              disabled={activeStep <= 1}
              onPress={() => setActiveStep((s) => Math.max(1, s - 1))}
            >
              <ChevronLeft size={16} color={currentColors.textPrimary} />
              <Text style={[styles.stepBtnText, { color: currentColors.textPrimary }]}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stepBtnPrimary, { backgroundColor: tokens.colors.primary[600] }]}
              onPress={() =>
                navigation.navigate('StepWorkflow', {
                  projectId: project._id || project.id,
                  stepNumber: activeStep,
                })
              }
            >
              <Text style={styles.stepBtnPrimaryText}>Work Step {activeStep}</Text>
              <ChevronRight size={16} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: currentColors.border, opacity: activeStep >= 11 ? 0.3 : 1 }]}
              disabled={activeStep >= 11}
              onPress={() => setActiveStep((s) => Math.min(11, s + 1))}
            >
              <Text style={[styles.stepBtnText, { color: currentColors.textPrimary }]}>Next</Text>
              <ChevronRight size={16} color={currentColors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Collapsible Component Cards ─────────────────────────────────── */}

        {/* 1. Literature & Papers */}
        <TouchableOpacity
          style={[styles.collapsibleHeader, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
          onPress={() => toggleSection('literature')}
        >
          <View style={styles.collapsibleLeft}>
            <FileText size={18} color="#3b82f6" />
            <Text style={[styles.collapsibleTitle, { color: currentColors.textPrimary }]}>
              Literature Support ({papers.length} Papers)
            </Text>
          </View>
          {expandedSections.literature ? (
            <ChevronUp size={18} color={currentColors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={currentColors.textSecondary} />
          )}
        </TouchableOpacity>
        {expandedSections.literature && (
          <View style={[styles.collapsibleBody, { backgroundColor: currentColors.canvas, borderColor: currentColors.border }]}>
            {papers.length === 0 ? (
              <Text style={[styles.emptySectionText, { color: currentColors.textSecondary }]}>
                No papers extracted yet. Upload papers in Step 1 to ground your research.
              </Text>
            ) : (
              papers.map((p, idx) => (
                <View key={idx} style={[styles.itemCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                  <Text style={[styles.itemTitle, { color: currentColors.textPrimary }]}>{p.title}</Text>
                  <Text style={[styles.itemMeta, { color: currentColors.textSecondary }]}>
                    {p.authors?.join(', ') || 'Unknown Authors'} · {p.year || 2024}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* 2. Research Gaps & Questions */}
        <TouchableOpacity
          style={[styles.collapsibleHeader, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
          onPress={() => toggleSection('integrity')}
        >
          <View style={styles.collapsibleLeft}>
            <Sparkles size={18} color="#8b5cf6" />
            <Text style={[styles.collapsibleTitle, { color: currentColors.textPrimary }]}>
              Gaps ({gaps.length}) & Hypotheses ({rqs.length})
            </Text>
          </View>
          {expandedSections.integrity ? (
            <ChevronUp size={18} color={currentColors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={currentColors.textSecondary} />
          )}
        </TouchableOpacity>
        {expandedSections.integrity && (
          <View style={[styles.collapsibleBody, { backgroundColor: currentColors.canvas, borderColor: currentColors.border }]}>
            {gaps.map((g, idx) => (
              <View key={idx} style={[styles.itemCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                <Text style={[styles.gapBadge, { color: tokens.colors.primary[500] }]}>GAP {idx + 1}</Text>
                <Text style={[styles.itemTitle, { color: currentColors.textPrimary }]}>{g.title || g.description}</Text>
              </View>
            ))}
            {rqs.map((q, idx) => (
              <View key={idx} style={[styles.itemCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                <Text style={[styles.gapBadge, { color: tokens.colors.success[500] }]}>{q.rqCode || `RQ${idx + 1}`}</Text>
                <Text style={[styles.itemTitle, { color: currentColors.textPrimary }]}>{q.question}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 3. Methodology & Baselines */}
        <TouchableOpacity
          style={[styles.collapsibleHeader, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
          onPress={() => toggleSection('methodology')}
        >
          <View style={styles.collapsibleLeft}>
            <ShieldCheck size={18} color="#10b981" />
            <Text style={[styles.collapsibleTitle, { color: currentColors.textPrimary }]}>
              Methodology & Baselines ({baselines.length})
            </Text>
          </View>
          {expandedSections.methodology ? (
            <ChevronUp size={18} color={currentColors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={currentColors.textSecondary} />
          )}
        </TouchableOpacity>
        {expandedSections.methodology && (
          <View style={[styles.collapsibleBody, { backgroundColor: currentColors.canvas, borderColor: currentColors.border }]}>
            <View style={[styles.itemCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
              <Text style={[styles.itemSubtitle, { color: currentColors.textSecondary }]}>Proposed Architecture</Text>
              <Text style={[styles.itemBody, { color: currentColors.textPrimary }]}>
                {project.methodology?.proposedArchitecture || 'Synthesized multi-scale architecture with empirical control.'}
              </Text>
            </View>
          </View>
        )}

        {/* 4. Experiments & Verified Results */}
        <TouchableOpacity
          style={[styles.collapsibleHeader, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
          onPress={() => toggleSection('experiments')}
        >
          <View style={styles.collapsibleLeft}>
            <CheckCircle2 size={18} color="#f59e0b" />
            <Text style={[styles.collapsibleTitle, { color: currentColors.textPrimary }]}>
              Verified Results ({results.filter((r) => r.verified).length}/{results.length})
            </Text>
          </View>
          {expandedSections.experiments ? (
            <ChevronUp size={18} color={currentColors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={currentColors.textSecondary} />
          )}
        </TouchableOpacity>
        {expandedSections.experiments && (
          <View style={[styles.collapsibleBody, { backgroundColor: currentColors.canvas, borderColor: currentColors.border }]}>
            {results.length === 0 ? (
              <Text style={[styles.emptySectionText, { color: currentColors.textSecondary }]}>
                No experiment results recorded yet. Add benchmark runs in Step 9.
              </Text>
            ) : (
              results.map((r, idx) => (
                <View key={idx} style={[styles.itemCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                  <Text style={[styles.itemTitle, { color: currentColors.textPrimary }]}>{r.experimentName || `Run ${idx + 1}`}</Text>
                  <Text style={[styles.itemMeta, { color: currentColors.textSecondary }]}>
                    Metric: {r.metric} · Value: {r.value} · Gain: {r.gain || 'N/A'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* 5. Manuscript & PDF Export */}
        <TouchableOpacity
          style={[styles.collapsibleHeader, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
          onPress={() => toggleSection('manuscript')}
        >
          <View style={styles.collapsibleLeft}>
            <BookOpen size={18} color="#6366f1" />
            <Text style={[styles.collapsibleTitle, { color: currentColors.textPrimary }]}>Manuscript & Export</Text>
          </View>
          {expandedSections.manuscript ? (
            <ChevronUp size={18} color={currentColors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={currentColors.textSecondary} />
          )}
        </TouchableOpacity>
        {expandedSections.manuscript && (
          <View style={[styles.collapsibleBody, { backgroundColor: currentColors.canvas, borderColor: currentColors.border }]}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: tokens.colors.primary[600] }]}
              onPress={() =>
                navigation.navigate('ManuscriptPreview', {
                  projectId: project._id || project.id,
                })
              }
            >
              <BookOpen size={16} color="#ffffff" />
              <Text style={styles.primaryActionBtnText}>Preview Manuscript Draft</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  projectTopic: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  readinessWrap: {
    marginVertical: 4,
  },
  pillarsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
  },
  pillarsToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pillarsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  pillarItem: {
    flex: 1,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  pillarLabel: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pillarVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  stepperCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  stepperSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepperTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 12,
  },
  stepperNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepBtnPrimary: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stepBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  collapsibleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collapsibleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  collapsibleBody: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  emptySectionText: {
    fontSize: 12,
    padding: 8,
    textAlign: 'center',
  },
  itemCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  itemBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  itemMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  gapBadge: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ProjectDetailScreen;
