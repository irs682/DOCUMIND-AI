import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, Sparkles, CheckCircle2, ChevronRight, Play } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../../../packages/api-client/index.js';

const WORKSTEP_METADATA = [
  {},
  { title: 'Add Papers', objective: 'Collect, inspect, and parse foundational literature.' },
  { title: 'Research Goal', objective: 'Synthesize research scope and principal contributions.' },
  { title: 'Related Work', objective: 'Structure comparative literature table.' },
  { title: 'Comparison Matrix', objective: 'Extract taxonomy of baseline methodologies.' },
  { title: 'Research Gaps', objective: 'Pinpoint theoretical and empirical deficiencies.' },
  { title: 'Questions & Hypotheses', objective: 'Formulate quantifiable research questions.' },
  { title: 'Methodology', objective: 'Formalize system architecture and formulations.' },
  { title: 'Benchmarks & Baselines', objective: 'Bind evaluation datasets and target metrics.' },
  { title: 'Results & Gains', objective: 'Verify benchmark outcomes and empirical gains.' },
  { title: 'Discussion & Analysis', objective: 'Analyze ablations and limitations.' },
  { title: 'Paper Draft', objective: 'Generate and review full academic manuscript.' },
];

export const StepWorkflowScreen = ({ route, navigation }) => {
  const { projectId, stepNumber = 1 } = route.params;
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const meta = WORKSTEP_METADATA[stepNumber] || { title: `Step ${stepNumber}`, objective: 'Execute step' };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.projects.get(projectId);
        const proj = res.data?.project || res.project || res;
        setProject(proj);
      } catch (err) {
        console.warn('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const handleExecute = async () => {
    try {
      setExecuting(true);
      const res = await apiClient.projects.executeStep(projectId, stepNumber, {});
      setExecutionResult(res.data || res);
      Alert.alert('Step Synthesized', `Step ${stepNumber} completed successfully.`);
    } catch (err) {
      Alert.alert('Execution Error', err.message || 'Could not execute step with AI.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      {/* Navbar */}
      <View style={[styles.navBar, { borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={currentColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: currentColors.textPrimary }]}>
          Step {stepNumber} of 11
        </Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Step Banner */}
        <View style={[styles.bannerCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
          <Text style={[styles.stepNum, { color: tokens.colors.primary[500] }]}>STEP {stepNumber}</Text>
          <Text style={[styles.stepTitle, { color: currentColors.textPrimary }]}>{meta.title}</Text>
          <Text style={[styles.stepObjective, { color: currentColors.textSecondary }]}>{meta.objective}</Text>

          <TouchableOpacity
            style={[styles.executeBtn, { backgroundColor: tokens.colors.primary[600] }]}
            onPress={handleExecute}
            disabled={executing}
          >
            {executing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Sparkles size={16} color="#ffffff" />
                <Text style={styles.executeBtnText}>Synthesize Step with AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Content for this step */}
        <View style={[styles.sectionBox, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
          <Text style={[styles.sectionTitle, { color: currentColors.textPrimary }]}>Study Context</Text>
          <Text style={[styles.bodyText, { color: currentColors.textSecondary }]}>
            {project?.title ? `Active Study: ${project.title}` : 'Loading...'}
          </Text>
          {project?.researchTopic && (
            <Text style={[styles.bodyText, { color: currentColors.textSecondary, marginTop: 4 }]}>
              Topic: {project.researchTopic}
            </Text>
          )}
        </View>

        {/* AI Synthesis Outcome */}
        {executionResult && (
          <View style={[styles.resultBox, { backgroundColor: currentColors.surface, borderColor: tokens.colors.success[500] }]}>
            <View style={styles.resultHeader}>
              <CheckCircle2 size={16} color={tokens.colors.success[500]} />
              <Text style={[styles.resultTitle, { color: tokens.colors.success[500] }]}>Synthesis Output</Text>
            </View>
            <Text style={[styles.resultBody, { color: currentColors.textPrimary }]}>
              {JSON.stringify(executionResult, null, 2)}
            </Text>
          </View>
        )}

        {/* Navigation to Next Step */}
        {stepNumber < 11 && (
          <TouchableOpacity
            style={[styles.nextBtn, { borderColor: currentColors.border }]}
            onPress={() =>
              navigation.replace('StepWorkflow', {
                projectId,
                stepNumber: stepNumber + 1,
              })
            }
          >
            <Text style={[styles.nextBtnText, { color: currentColors.textPrimary }]}>
              Continue to Step {stepNumber + 1}: {WORKSTEP_METADATA[stepNumber + 1]?.title}
            </Text>
            <ChevronRight size={16} color={currentColors.textPrimary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  stepNum: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  stepObjective: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  executeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  executeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  resultBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultBody: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  nextBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StepWorkflowScreen;
