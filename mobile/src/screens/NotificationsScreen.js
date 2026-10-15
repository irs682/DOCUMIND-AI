import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  AlertCircle,
  FileText,
  BookOpen,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export const NotificationsScreen = ({ navigation }) => {
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'Literature Analysis Complete',
      message: 'Paper "Empirical Bounds in Multi-Agent RL" has been fully parsed and indexed into Qdrant.',
      time: '10m ago',
      type: 'paper_processed',
      read: false,
      route: 'Documents',
    },
    {
      id: 'n2',
      title: 'Manuscript Generation Ready',
      message: 'Draft sections for "Autonomous Robotic Policy Synthesis" are available for review.',
      time: '1h ago',
      type: 'manuscript_ready',
      read: false,
      route: 'Research',
    },
    {
      id: 'n3',
      title: 'Citation Audit Notice',
      message: 'Step 4 Comparison Matrix requires 1 additional baseline citation to satisfy integrity gate.',
      time: '4h ago',
      type: 'citation_issue',
      read: true,
      route: 'Research',
    },
  ]);

  const handlePress = (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.route) {
      navigation.navigate(notif.route);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'paper_processed':
        return <FileText size={18} color="#3b82f6" />;
      case 'manuscript_ready':
        return <BookOpen size={18} color="#10b981" />;
      case 'citation_issue':
        return <AlertCircle size={18} color="#f59e0b" />;
      default:
        return <Bell size={18} color="#6366f1" />;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      {/* Navbar */}
      <View style={[styles.navBar, { borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={currentColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: currentColors.textPrimary }]}>Notifications</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {notifications.map((n) => (
          <TouchableOpacity
            key={n.id}
            style={[
              styles.notifCard,
              {
                backgroundColor: currentColors.surface,
                borderColor: currentColors.border,
                opacity: n.read ? 0.75 : 1,
              },
            ]}
            onPress={() => handlePress(n)}
          >
            <View style={[styles.iconWrap, { backgroundColor: currentColors.canvas }]}>
              {getIcon(n.type)}
            </View>
            <View style={styles.details}>
              <View style={styles.topRow}>
                <Text style={[styles.title, { color: currentColors.textPrimary }]} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={[styles.time, { color: currentColors.textSecondary }]}>{n.time}</Text>
              </View>
              <Text style={[styles.message, { color: currentColors.textSecondary }]}>{n.message}</Text>
            </View>
            {!n.read && <View style={[styles.unreadDot, { backgroundColor: tokens.colors.primary[500] }]} />}
          </TouchableOpacity>
        ))}
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
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 10,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
});

export default NotificationsScreen;
