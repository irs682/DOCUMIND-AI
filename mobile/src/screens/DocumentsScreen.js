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
  Alert,
} from 'react-native';
import {
  FileText,
  Upload,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Database,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../../../packages/api-client/index.js';
import { formatRelativeTime, formatFileSize } from '../../../packages/utilities/index.js';
import { cacheDocuments, getCachedDocuments } from '../services/offlineCache';

export const DocumentsScreen = ({ navigation }) => {
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedKb, setSelectedKb] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = useCallback(async (force = false) => {
    try {
      const res = await apiClient.documents.list(force);
      const docs = res.documents || (Array.isArray(res) ? res : []);
      setDocuments(docs);
      await cacheDocuments(docs);
    } catch (_) {
      const cached = await getCachedDocuments();
      if (cached.length) setDocuments(cached);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments(true);
    setRefreshing(false);
  };

  const handleDelete = (docId, title) => {
    Alert.alert('Delete Document', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.documents.delete(docId);
            setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== docId));
          } catch (err) {
            Alert.alert('Error', err.message || 'Could not delete document');
          }
        },
      },
    ]);
  };

  const filtered = documents.filter((d) => {
    const matchesSearch = !search || (d.originalName || d.title || d.filename || '').toLowerCase().includes(search.toLowerCase());
    const matchesKb = selectedKb === 'all' || (d.knowledgeBase || 'General KB') === selectedKb;
    return matchesSearch && matchesKb;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: currentColors.textPrimary }]}>Documents</Text>
          <TouchableOpacity
            style={[styles.uploadBtn, { backgroundColor: tokens.colors.primary[600] }]}
            onPress={() => navigation.navigate('UploadDocument')}
          >
            <Upload size={15} color="#ffffff" />
            <Text style={styles.uploadBtnText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
          <Search size={16} color={currentColors.textSecondary} />
          <TextInput
            placeholder="Search papers & documents..."
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
            <FileText size={32} color="#6366f1" />
            <Text style={[styles.emptyTitle, { color: currentColors.textPrimary }]}>No Documents Found</Text>
            <Text style={[styles.emptyDesc, { color: currentColors.textSecondary }]}>
              {search ? 'Try clearing your search query.' : 'Upload your first paper or document to ground your AI research.'}
            </Text>
          </View>
        ) : (
          filtered.map((doc) => {
            const dId = doc._id || doc.id;
            const isIndexed = doc.status === 'indexed';
            const isFailed = doc.status === 'error' || doc.status === 'failed';

            return (
              <View
                key={dId}
                style={[styles.docCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.docIcon, { backgroundColor: isIndexed ? '#10b98115' : isFailed ? '#ef444415' : '#f59e0b15' }]}>
                    <FileText size={20} color={isIndexed ? '#10b981' : isFailed ? '#ef4444' : '#f59e0b'} />
                  </View>
                  <View style={styles.docHeaderDetails}>
                    <Text style={[styles.docName, { color: currentColors.textPrimary }]} numberOfLines={2}>
                      {doc.originalName || doc.title || doc.filename}
                    </Text>
                    <Text style={[styles.docSub, { color: currentColors.textSecondary }]}>
                      {doc.knowledgeBase || 'General KB'} · {formatFileSize(doc.fileSize)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(dId, doc.originalName || doc.title)}
                    style={styles.delBtn}
                  >
                    <Trash2 size={16} color={currentColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Status Bar */}
                <View style={[styles.cardBottom, { borderTopColor: currentColors.border }]}>
                  <View style={styles.statusRow}>
                    {isIndexed ? (
                      <CheckCircle2 size={13} color="#10b981" />
                    ) : isFailed ? (
                      <AlertCircle size={13} color="#ef4444" />
                    ) : (
                      <Clock size={13} color="#f59e0b" />
                    )}
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: isIndexed ? '#10b981' : isFailed ? '#ef4444' : '#f59e0b' },
                      ]}
                    >
                      {isIndexed ? 'Indexed in Qdrant' : isFailed ? 'Failed' : 'Processing Evidence'}
                    </Text>
                  </View>

                  <Text style={[styles.timeText, { color: currentColors.textSecondary }]}>
                    {formatRelativeTime(doc.uploadedAt || doc.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  uploadBtnText: {
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
  docCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  docIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docHeaderDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  docSub: {
    fontSize: 11,
    marginTop: 2,
  },
  delBtn: {
    padding: 6,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 10,
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
});

export default DocumentsScreen;
