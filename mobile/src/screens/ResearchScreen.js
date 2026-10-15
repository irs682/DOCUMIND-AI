import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Sparkles, Plus, Search, ChevronRight, Layers, FileText, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../../../packages/api-client/index.js';
import { calculateProjectReadiness } from '../../../packages/utilities/index.js';
import ResearchReadinessMeter from '../components/ResearchReadinessMeter';
import { cacheProjects, getCachedProjects } from '../services/offlineCache';

export const ResearchScreen = ({ navigation }) => {
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async (force = false) => {
    try {
      const res = await apiClient.projects.list(force);
      const list = res.data?.projects || res.projects || [];
      setProjects(list);
      await cacheProjects(list);
    } catch (_) {
      const cached = await getCachedProjects();
      if (cached.length) setProjects(cached);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects(true);
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required Field', 'Please provide a project title');
      return;
    }
    try {
      setCreating(true);
      const res = await apiClient.projects.create({
        title: newTitle.trim(),
        researchTopic: newTopic.trim() || 'Scientific Research',
        methodology: { proposedArchitecture: 'Deep Learning Synthesis' },
      });
      const created = res.data?.project || res.project || res;
      setNewTitle('');
      setNewTopic('');
      setShowNewModal(false);
      await loadProjects(true);
      if (created?._id || created?.id) {
        navigation.navigate('ProjectDetail', { projectId: created._id || created.id });
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not create research project');
    } finally {
      setCreating(false);
    }
  };

  const filtered = projects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.researchTopic?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: currentColors.textPrimary }]}>Research Studies</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: tokens.colors.primary[600] }]}
            onPress={() => setShowNewModal(true)}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.addBtnText}>New Study</Text>
          </TouchableOpacity>
        </View>

        {/* Search input */}
        <View style={[styles.searchBox, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
          <Search size={16} color={currentColors.textSecondary} />
          <TextInput
            placeholder="Search research projects..."
            placeholderTextColor={currentColors.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: currentColors.textPrimary }]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {filtered.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <Sparkles size={32} color="#6366f1" />
            <Text style={[styles.emptyTitle, { color: currentColors.textPrimary }]}>No Research Projects</Text>
            <Text style={[styles.emptyDesc, { color: currentColors.textSecondary }]}>
              {search ? 'No projects match your query.' : 'Initialize your first 11-step academic research project.'}
            </Text>
          </View>
        ) : (
          filtered.map((proj) => {
            const pId = proj._id || proj.id;
            const readiness = calculateProjectReadiness(proj);
            const papersCount = proj.paperProfiles?.length || proj.documentIds?.length || 0;
            const gapsCount = proj.researchGaps?.length || 0;

            return (
              <TouchableOpacity
                key={pId}
                style={[styles.projectCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ProjectDetail', { projectId: pId })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={[styles.cardTitle, { color: currentColors.textPrimary }]}>
                      {proj.title}
                    </Text>
                    <Text style={[styles.cardTopic, { color: currentColors.textSecondary }]} numberOfLines={1}>
                      {proj.researchTopic || 'Autonomous Research'}
                    </Text>
                  </View>
                  <View style={[styles.stepPill, { backgroundColor: '#6366f118' }]}>
                    <Text style={[styles.stepText, { color: tokens.colors.primary[500] }]}>
                      Step {proj.currentStep || 1}/11
                    </Text>
                  </View>
                </View>

                {/* Readiness Meter */}
                <View style={styles.meterWrap}>
                  <ResearchReadinessMeter score={readiness.score} label={readiness.label} size="sm" />
                </View>

                {/* Footer metadata */}
                <View style={[styles.cardFooter, { borderTopColor: currentColors.border }]}>
                  <View style={styles.countsRow}>
                    <FileText size={13} color={currentColors.textSecondary} />
                    <Text style={[styles.countText, { color: currentColors.textSecondary }]}>
                      {papersCount} papers
                    </Text>
                    <Text style={{ color: currentColors.textSecondary }}>·</Text>
                    <Text style={[styles.countText, { color: currentColors.textSecondary }]}>
                      {gapsCount} gaps identified
                    </Text>
                  </View>

                  <View style={styles.openLink}>
                    <Text style={[styles.openLinkText, { color: tokens.colors.primary[500] }]}>Inspect</Text>
                    <ChevronRight size={14} color={tokens.colors.primary[500]} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* New Project Modal */}
      <Modal visible={showNewModal} transparent animationType="slide" onRequestClose={() => setShowNewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentColors.textPrimary }]}>Initialize Study</Text>
              <TouchableOpacity onPress={() => setShowNewModal(false)}>
                <X size={20} color={currentColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>Project Title *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: currentColors.canvas, borderColor: currentColors.border, color: currentColors.textPrimary }]}
              placeholder="e.g. Robust Multimodal VLA Policy"
              placeholderTextColor={currentColors.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={[styles.inputLabel, { color: currentColors.textSecondary }]}>Research Topic</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: currentColors.canvas, borderColor: currentColors.border, color: currentColors.textPrimary }]}
              placeholder="e.g. Robot Manipulation with Latent Actions"
              placeholderTextColor={currentColors.textSecondary}
              value={newTopic}
              onChangeText={setNewTopic}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: currentColors.border }]}
                onPress={() => setShowNewModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: currentColors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: tokens.colors.primary[600] }]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create Study'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  projectCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardTopic: {
    fontSize: 11,
    marginTop: 2,
  },
  stepPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '700',
  },
  meterWrap: {
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countText: {
    fontSize: 11,
  },
  openLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  createBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ResearchScreen;
