import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import {
  Sparkles,
  ArrowRight,
  Upload,
  MessageSquare,
  BookOpen,
  FileText,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../../../packages/api-client/index.js';
import {
  calculateProjectReadiness,
  getTimeOfDayGreeting,
  formatRelativeTime,
  truncateText,
} from '../../../packages/utilities/index.js';
import ResearchReadinessMeter from '../components/ResearchReadinessMeter';
import QuickActionSheet from '../components/QuickActionSheet';
import OfflineBanner from '../components/OfflineBanner';
import {
  cacheProjects,
  getCachedProjects,
  cacheDocuments,
  getCachedDocuments,
} from '../services/offlineCache';

const WORKSTEP_NAMES = [
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

export const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadData = useCallback(async (force = false) => {
    try {
      const [projRes, docsRes] = await Promise.allSettled([
        apiClient.projects.list(force),
        apiClient.documents.list(force),
      ]);

      let loadedProjects = [];
      let loadedDocs = [];

      if (projRes.status === 'fulfilled') {
        loadedProjects = projRes.value?.data?.projects || projRes.value?.projects || [];
        setProjects(loadedProjects);
        await cacheProjects(loadedProjects);
        setIsOffline(false);
      } else {
        // Fallback to offline cache
        loadedProjects = await getCachedProjects();
        if (loadedProjects.length) {
          setProjects(loadedProjects);
          setIsOffline(true);
        }
      }

      if (docsRes.status === 'fulfilled') {
        loadedDocs = docsRes.value?.documents || (Array.isArray(docsRes.value) ? docsRes.value : []);
        setDocuments(loadedDocs);
        await cacheDocuments(loadedDocs);
      } else {
        loadedDocs = await getCachedDocuments();
        if (loadedDocs.length) setDocuments(loadedDocs);
      }
    } catch (_) {
      const cachedProj = await getCachedProjects();
      if (cachedProj.length) {
        setProjects(cachedProj);
        setIsOffline(true);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const activeProject = projects[0] || null;
  const activeReadiness = calculateProjectReadiness(activeProject);
  const firstName = user?.name?.split(' ')[0] || 'Researcher';
  const greeting = getTimeOfDayGreeting();

  // Attention triage items derived from active study
  const getAttentionItems = () => {
    if (!activeProject) return [];
    const items = [];
    const verifiedResults = (activeProject.userResults || []).filter((r) => r.verified).length;
    const papersCount = activeProject.paperProfiles?.length || activeProject.documentIds?.length || 0;

    if (verifiedResults === 0 && (activeProject.currentStep || 1) >= 8) {
      items.push({
        id: '1',
        title: 'Empirical Verification Gate',
        desc: 'Readiness capped at 72% until verified test runs are added in Step 9.',
      });
    }
    if (papersCount <= 1) {
      items.push({
        id: '2',
        title: 'Limited Literature Support',
        desc: 'Add at least 2 papers to substantiate methodology baselines.',
      });
    }
    return items;
  };

  const attentionItems = getAttentionItems();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      <OfflineBanner isOffline={isOffline} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <View>
            <View style={styles.badgeRow}>
              <View style={[styles.pill, { backgroundColor: '#6366f118' }]}>
                <Sparkles size={12} color="#6366f1" />
                <Text style={styles.pillText}>Research Companion</Text>
              </View>
            </View>
            <Text style={[styles.greeting, { color: currentColors.textPrimary }]}>
              {greeting}, {firstName}
            </Text>
            <Text style={[styles.subGreeting, { color: currentColors.textSecondary }]}>
              Synchronized with DOCUMIND-AI Web Workstation
            </Text>
          </View>
        </View>

        {/* ── Active Project Spotlight Card ──────────────────────────────── */}
        {activeProject ? (
          <View style={[styles.spotlightCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <View style={styles.spotlightTop}>
              <View style={styles.spotlightTag}>
                <Text style={styles.spotlightTagText}>ACTIVE STUDY</Text>
              </View>
              <Text style={[styles.stepBadge, { color: tokens.colors.primary[500] }]}>
                {WORKSTEP_NAMES[activeProject.currentStep] || `Step ${activeProject.currentStep}/11`}
              </Text>
            </View>

            <Text style={[styles.projectTitle, { color: currentColors.textPrimary }]}>
              {activeProject.title}
            </Text>
            <Text style={[styles.projectTopic, { color: currentColors.textSecondary }]}>
              {activeProject.researchTopic || 'Autonomous Research & Synthesis'}
            </Text>

            {/* Scientific Readiness Bar */}
            <View style={styles.readinessContainer}>
              <ResearchReadinessMeter score={activeReadiness.score} label={activeReadiness.label} />
            </View>

            {/* Needs Attention items */}
            {attentionItems.length > 0 && (
              <View style={[styles.attentionBox, { backgroundColor: tokens.colors.warning[50] + '20', borderColor: tokens.colors.warning[500] + '40' }]}>
                <View style={styles.attentionHeader}>
                  <AlertCircle size={14} color={tokens.colors.warning[500]} />
                  <Text style={[styles.attentionTitle, { color: tokens.colors.warning[500] }]}>Needs Attention</Text>
                </View>
                {attentionItems.map((item) => (
                  <Text key={item.id} style={[styles.attentionDesc, { color: currentColors.textSecondary }]}>
                    • {item.title}: {item.desc}
                  </Text>
                ))}
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: tokens.colors.primary[600] }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: activeProject._id || activeProject.id })}
            >
              <Text style={styles.continueButtonText}>Continue Research</Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <Sparkles size={28} color="#6366f1" />
            <Text style={[styles.emptyTitle, { color: currentColors.textPrimary }]}>No Active Studies Yet</Text>
            <Text style={[styles.emptyDesc, { color: currentColors.textSecondary }]}>
              Initialize a research study on mobile or create one on the web workstation.
            </Text>
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: tokens.colors.primary[600], marginTop: 12 }]}
              onPress={() => navigation.navigate('Research')}
            >
              <Text style={styles.continueButtonText}>Explore Research Projects</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Quick Action Tiles ─────────────────────────────────────────── */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.quickTile, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
            onPress={() => navigation.navigate('UploadDocument')}
          >
            <View style={[styles.tileIcon, { backgroundColor: '#3b82f615' }]}>
              <Upload size={18} color="#3b82f6" />
            </View>
            <Text style={[styles.tileLabel, { color: currentColors.textPrimary }]}>Upload Paper</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickTile, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
            onPress={() => navigation.navigate('AIChat')}
          >
            <View style={[styles.tileIcon, { backgroundColor: '#6366f115' }]}>
              <MessageSquare size={18} color="#6366f1" />
            </View>
            <Text style={[styles.tileLabel, { color: currentColors.textPrimary }]}>Ask AI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickTile, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
            onPress={() => {
              if (activeProject) {
                navigation.navigate('ManuscriptPreview', { projectId: activeProject._id || activeProject.id });
              } else {
                navigation.navigate('Research');
              }
            }}
          >
            <View style={[styles.tileIcon, { backgroundColor: '#10b98115' }]}>
              <BookOpen size={18} color="#10b981" />
            </View>
            <Text style={[styles.tileLabel, { color: currentColors.textPrimary }]}>Manuscript</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Projects Section ────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentColors.textPrimary }]}>Recent Projects</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Research')}>
            <Text style={[styles.sectionLink, { color: tokens.colors.primary[500] }]}>View all</Text>
          </TouchableOpacity>
        </View>

        {projects.slice(0, 3).map((proj) => {
          const readiness = calculateProjectReadiness(proj);
          const pId = proj._id || proj.id;
          return (
            <TouchableOpacity
              key={pId}
              style={[styles.projectRowCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: pId })}
            >
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: currentColors.textPrimary }]} numberOfLines={1}>
                  {proj.title}
                </Text>
                <Text style={[styles.rowTopic, { color: currentColors.textSecondary }]} numberOfLines={1}>
                  {proj.researchTopic || 'Research Study'}
                </Text>
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowStep, { color: tokens.colors.primary[500] }]}>
                    Step {proj.currentStep || 1}/11
                  </Text>
                  <Text style={[styles.rowScore, { color: currentColors.textSecondary }]}>
                    · {readiness.score}% readiness
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={currentColors.textSecondary} />
            </TouchableOpacity>
          );
        })}

        {/* ── Recent Documents Section ───────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentColors.textPrimary }]}>Recent Documents</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Documents')}>
            <Text style={[styles.sectionLink, { color: tokens.colors.primary[500] }]}>View all</Text>
          </TouchableOpacity>
        </View>

        {documents.slice(0, 3).map((doc) => {
          const dId = doc._id || doc.id;
          const isIndexed = doc.status === 'indexed';
          return (
            <View
              key={dId}
              style={[styles.docRowCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
            >
              <View style={[styles.docIconWrap, { backgroundColor: isIndexed ? '#10b98115' : '#f59e0b15' }]}>
                <FileText size={18} color={isIndexed ? '#10b981' : '#f59e0b'} />
              </View>
              <View style={styles.docInfo}>
                <Text style={[styles.docTitle, { color: currentColors.textPrimary }]} numberOfLines={1}>
                  {doc.originalName || doc.title || doc.filename}
                </Text>
                <Text style={[styles.docMeta, { color: currentColors.textSecondary }]}>
                  {doc.knowledgeBase || 'General KB'} · {formatRelativeTime(doc.uploadedAt || doc.createdAt)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  { backgroundColor: isIndexed ? '#10b98118' : '#f59e0b18' },
                ]}
              >
                <Text style={[styles.statusText, { color: isIndexed ? '#10b981' : '#f59e0b' }]}>
                  {isIndexed ? 'Indexed' : 'Processing'}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Floating Action Button for Quick Actions */}
      <QuickActionSheet navigation={navigation} activeProjectId={activeProject?._id || activeProject?.id} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  header: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 12,
    marginTop: 2,
  },
  spotlightCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  spotlightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spotlightTag: {
    backgroundColor: '#6366f120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spotlightTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 0.5,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  projectTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  projectTopic: {
    fontSize: 12,
    marginBottom: 12,
  },
  readinessContainer: {
    marginVertical: 4,
  },
  attentionBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  attentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  attentionTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  attentionDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  rowMain: {
    flex: 1,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowTopic: {
    fontSize: 11,
    marginTop: 2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rowStep: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowScore: {
    fontSize: 11,
  },
  docRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  docMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default HomeScreen;
