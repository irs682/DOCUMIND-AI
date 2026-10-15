import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const ResearchReadinessMeter = ({ score = 0, label = 'Early Concept', size = 'md' }) => {
  const { tokens } = useTheme();
  const currentColors = tokens.colors.current;

  const getScoreColor = () => {
    if (score >= 90) return tokens.colors.success[500];
    if (score >= 75) return tokens.colors.primary[500];
    if (score >= 50) return '#6366f1';
    return tokens.colors.warning[500];
  };

  const isSmall = size === 'sm';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: currentColors.textSecondary, fontSize: isSmall ? 11 : 12 }]}>
          Research Readiness
        </Text>
        <Text style={[styles.scoreValue, { color: getScoreColor(), fontSize: isSmall ? 12 : 14 }]}>
          {score}% ({label})
        </Text>
      </View>

      <View style={[styles.barBackground, { backgroundColor: currentColors.border, height: isSmall ? 6 : 8 }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(100, Math.max(0, score))}%`,
              backgroundColor: getScoreColor(),
              height: isSmall ? 6 : 8,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontWeight: '600',
  },
  scoreValue: {
    fontWeight: '700',
  },
  barBackground: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 999,
  },
});

export default ResearchReadinessMeter;
