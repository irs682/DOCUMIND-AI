import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export const OfflineBanner = ({ isOffline = false }) => {
  const { tokens } = useTheme();

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: tokens.colors.warning[500] + '20', borderColor: tokens.colors.warning[500] }]}>
      <WifiOff size={14} color={tokens.colors.warning[500]} />
      <Text style={[styles.text, { color: tokens.colors.warning[500] }]}>
        Offline Companion Mode — Viewing cached data. Internet required for AI synthesis.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});

export default OfflineBanner;
