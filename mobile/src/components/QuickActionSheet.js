import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Plus, Upload, MessageSquare, Sparkles, BookOpen, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export const QuickActionSheet = ({ navigation, activeProjectId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const actions = [
    {
      id: 'upload',
      title: 'Upload Paper',
      subtitle: 'PDF, DOCX, research papers',
      icon: Upload,
      color: '#3b82f6',
      onPress: () => {
        setIsOpen(false);
        navigation.navigate('UploadDocument');
      },
    },
    {
      id: 'chat',
      title: 'Ask DOCUMIND AI',
      subtitle: 'Query literature & papers',
      icon: MessageSquare,
      color: '#6366f1',
      onPress: () => {
        setIsOpen(false);
        navigation.navigate('AIChat');
      },
    },
    {
      id: 'new_project',
      title: 'New Research Project',
      subtitle: 'Initialize 11-step study',
      icon: Sparkles,
      color: '#8b5cf6',
      onPress: () => {
        setIsOpen(false);
        navigation.navigate('Research');
      },
    },
    {
      id: 'manuscript',
      title: 'Manuscript Review',
      subtitle: 'Preview active draft & PDF',
      icon: BookOpen,
      color: '#10b981',
      onPress: () => {
        setIsOpen(false);
        if (activeProjectId) {
          navigation.navigate('ManuscriptPreview', { projectId: activeProjectId });
        } else {
          navigation.navigate('Research');
        }
      },
    },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: tokens.colors.primary[600] }]}
        activeOpacity={0.85}
        onPress={() => setIsOpen(true)}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Action Sheet Modal */}
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                <View style={styles.header}>
                  <View>
                    <Text style={[styles.title, { color: currentColors.textPrimary }]}>Quick Research Actions</Text>
                    <Text style={[styles.subtitle, { color: currentColors.textSecondary }]}>Companion shortcuts for mobile</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                    <X size={20} color={currentColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.actionList}>
                  {actions.map((act) => {
                    const Icon = act.icon;
                    return (
                      <TouchableOpacity
                        key={act.id}
                        style={[styles.actionCard, { borderColor: currentColors.border }]}
                        activeOpacity={0.7}
                        onPress={act.onPress}
                      >
                        <View style={[styles.iconWrap, { backgroundColor: act.color + '15' }]}>
                          <Icon size={20} color={act.color} />
                        </View>
                        <View style={styles.actionText}>
                          <Text style={[styles.actionTitle, { color: currentColors.textPrimary }]}>{act.title}</Text>
                          <Text style={[styles.actionSubtitle, { color: currentColors.textSecondary }]}>{act.subtitle}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  actionList: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default QuickActionSheet;
