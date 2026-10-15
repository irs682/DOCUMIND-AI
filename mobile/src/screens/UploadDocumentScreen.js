import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../../../packages/api-client/index.js';
import { formatFileSize } from '../../../packages/utilities/index.js';

export const UploadDocumentScreen = ({ navigation }) => {
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const [selectedFile, setSelectedFile] = useState(null);
  const [knowledgeBase, setKnowledgeBase] = useState('General KB');
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'done' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setSelectedFile(res.assets[0]);
      }
    } catch (err) {
      Alert.alert('File Picker Error', err.message || 'Could not access file picker');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No file selected', 'Please choose a document to upload.');
      return;
    }

    try {
      setUploadStatus('uploading');

      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/pdf',
      });
      formData.append('knowledgeBase', knowledgeBase || 'General KB');

      setUploadStatus('processing');
      await apiClient.documents.upload(formData);
      setUploadStatus('done');

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage(err.message || 'Upload failed. Ensure backend server is reachable.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      {/* Top Navbar */}
      <View style={[styles.navBar, { borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={currentColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: currentColors.textPrimary }]}>Upload Paper</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.content}>
        {/* Upload Drop/Pick Area */}
        <TouchableOpacity
          style={[
            styles.dropZone,
            {
              backgroundColor: currentColors.surface,
              borderColor: selectedFile ? tokens.colors.primary[500] : currentColors.border,
            },
          ]}
          activeOpacity={0.8}
          onPress={pickFile}
          disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
        >
          {selectedFile ? (
            <View style={styles.fileSelectedWrap}>
              <FileText size={36} color={tokens.colors.primary[500]} />
              <Text style={[styles.fileName, { color: currentColors.textPrimary }]} numberOfLines={2}>
                {selectedFile.name}
              </Text>
              <Text style={[styles.fileSize, { color: currentColors.textSecondary }]}>
                {formatFileSize(selectedFile.size)}
              </Text>
              <Text style={[styles.changeText, { color: tokens.colors.primary[500] }]}>Tap to change file</Text>
            </View>
          ) : (
            <View style={styles.pickerPrompt}>
              <View style={[styles.uploadIconWrap, { backgroundColor: '#6366f115' }]}>
                <Upload size={28} color="#6366f1" />
              </View>
              <Text style={[styles.pickerTitle, { color: currentColors.textPrimary }]}>
                Select Research Paper
              </Text>
              <Text style={[styles.pickerSubtitle, { color: currentColors.textSecondary }]}>
                Supports PDF, DOCX, TXT. Grounded into Qdrant vector database.
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Knowledge Base Input */}
        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: currentColors.textSecondary }]}>
            Target Knowledge Base
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: currentColors.surface,
                borderColor: currentColors.border,
                color: currentColors.textPrimary,
              },
            ]}
            value={knowledgeBase}
            onChangeText={setKnowledgeBase}
            placeholder="e.g. General KB, Robotics Lab"
            placeholderTextColor={currentColors.textSecondary}
          />
        </View>

        {/* Status Stepper Card */}
        {uploadStatus !== 'idle' && (
          <View style={[styles.statusCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            {uploadStatus === 'uploading' && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={[styles.statusMsg, { color: currentColors.textPrimary }]}>Uploading paper to server...</Text>
              </View>
            )}
            {uploadStatus === 'processing' && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={[styles.statusMsg, { color: currentColors.textPrimary }]}>
                  Extracting text & generating Qdrant embeddings...
                </Text>
              </View>
            )}
            {uploadStatus === 'done' && (
              <View style={styles.statusRow}>
                <CheckCircle2 size={18} color="#10b981" />
                <Text style={[styles.statusMsg, { color: '#10b981' }]}>
                  Paper uploaded and indexed! Available on Web & Mobile.
                </Text>
              </View>
            )}
            {uploadStatus === 'error' && (
              <View style={styles.statusRow}>
                <AlertCircle size={18} color="#ef4444" />
                <Text style={[styles.statusMsg, { color: '#ef4444' }]}>{errorMessage}</Text>
              </View>
            )}
          </View>
        )}

        {/* Upload Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: tokens.colors.primary[600],
              opacity: !selectedFile || uploadStatus === 'uploading' || uploadStatus === 'processing' ? 0.5 : 1,
            },
          ]}
          disabled={!selectedFile || uploadStatus === 'uploading' || uploadStatus === 'processing'}
          onPress={handleUpload}
        >
          <Upload size={18} color="#ffffff" />
          <Text style={styles.submitBtnText}>Start Ingestion</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  dropZone: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pickerPrompt: {
    alignItems: 'center',
  },
  uploadIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  fileSelectedWrap: {
    alignItems: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 11,
    marginTop: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  statusCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusMsg: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default UploadDocumentScreen;
