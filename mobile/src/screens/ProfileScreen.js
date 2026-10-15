import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import {
  User,
  Shield,
  Moon,
  Sun,
  Bell,
  Wifi,
  Server,
  LogOut,
  Fingerprint,
  ChevronRight,
  Database,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { clearLocalStorage } from '../services/storage';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout, apiBaseUrl, updateApiBaseUrl } = useAuth();
  const { activeTheme, toggleTheme, tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [serverUrl, setServerUrl] = useState(apiBaseUrl);
  const [editingUrl, setEditingUrl] = useState(false);

  const handleSaveUrl = async () => {
    if (!serverUrl.trim()) return;
    await updateApiBaseUrl(serverUrl.trim());
    setEditingUrl(false);
    Alert.alert('Server URL Updated', `API client pointed to: ${serverUrl}`);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of DOCUMIND-AI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
          <View style={[styles.avatarWrap, { backgroundColor: tokens.colors.primary[600] }]}>
            <Text style={styles.avatarText}>
              {user?.name?.slice(0, 2)?.toUpperCase() || 'DM'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: currentColors.textPrimary }]}>
              {user?.name || 'Researcher'}
            </Text>
            <Text style={[styles.userEmail, { color: currentColors.textSecondary }]}>
              {user?.email || 'researcher@documind.ai'}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: '#6366f118' }]}>
              <Text style={[styles.roleText, { color: tokens.colors.primary[500] }]}>
                {user?.role?.toUpperCase() || 'SCIENTIST'} · AUTONOMOUS AGENT
              </Text>
            </View>
          </View>
        </View>

        {/* Device & Sync Settings */}
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }]}>DEVICE SETTINGS</Text>

        <View style={[styles.settingsGroup, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
          {/* Appearance Toggle */}
          <View style={[styles.settingRow, { borderBottomColor: currentColors.border }]}>
            <View style={styles.settingLeft}>
              {activeTheme === 'dark' ? (
                <Moon size={18} color="#6366f1" />
              ) : (
                <Sun size={18} color="#f59e0b" />
              )}
              <Text style={[styles.settingLabel, { color: currentColors.textPrimary }]}>Dark Mode</Text>
            </View>
            <Switch
              value={activeTheme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e1', true: tokens.colors.primary[600] }}
            />
          </View>

          {/* Biometrics App Lock */}
          <View style={[styles.settingRow, { borderBottomColor: currentColors.border }]}>
            <View style={styles.settingLeft}>
              <Fingerprint size={18} color="#10b981" />
              <View>
                <Text style={[styles.settingLabel, { color: currentColors.textPrimary }]}>Biometric App Lock</Text>
                <Text style={[styles.settingSub, { color: currentColors.textSecondary }]}>
                  Face ID / Touch ID local lock
                </Text>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: '#cbd5e1', true: tokens.colors.primary[600] }}
            />
          </View>

          {/* Push Notifications */}
          <View style={[styles.settingRow, { borderBottomColor: currentColors.border }]}>
            <View style={styles.settingLeft}>
              <Bell size={18} color="#3b82f6" />
              <Text style={[styles.settingLabel, { color: currentColors.textPrimary }]}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#cbd5e1', true: tokens.colors.primary[600] }}
            />
          </View>

          {/* Quick Notifications Center */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.settingLeft}>
              <Bell size={18} color="#8b5cf6" />
              <Text style={[styles.settingLabel, { color: currentColors.textPrimary }]}>
                Notification Center
              </Text>
            </View>
            <ChevronRight size={18} color={currentColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Backend & Networking Settings (LAN / Localhost) */}
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }]}>BACKEND & NETWORKING</Text>
        <View style={[styles.settingsGroup, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
          <View style={styles.settingColumn}>
            <View style={styles.settingLeft}>
              <Server size={18} color="#6366f1" />
              <Text style={[styles.settingLabel, { color: currentColors.textPrimary }]}>
                DOCUMIND-AI Backend Endpoint
              </Text>
            </View>
            <TextInput
              style={[
                styles.urlInput,
                {
                  backgroundColor: currentColors.canvas,
                  borderColor: currentColors.border,
                  color: currentColors.textPrimary,
                },
              ]}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.x:5000/api"
              placeholderTextColor={currentColors.textSecondary}
              autoCapitalize="none"
            />
            {serverUrl !== apiBaseUrl && (
              <TouchableOpacity
                style={[styles.saveUrlBtn, { backgroundColor: tokens.colors.primary[600] }]}
                onPress={handleSaveUrl}
              >
                <Text style={styles.saveUrlText}>Apply Endpoint</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.urlHelpText, { color: currentColors.textSecondary }]}>
              Physical devices cannot reach "localhost". Use your development machine's LAN IP.
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: '#ef444450', backgroundColor: '#ef444410' }]}
          onPress={handleLogout}
        >
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out of DOCUMIND-AI</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsGroup: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingColumn: {
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginTop: 10,
  },
  saveUrlBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveUrlText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  urlHelpText: {
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ProfileScreen;
