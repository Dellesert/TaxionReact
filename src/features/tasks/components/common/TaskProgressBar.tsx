/**
 * Task Progress Bar Component
 * Отображает прогресс выполнения задачи
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TaskProgressBarProps {
  progress: number; // 0-100
  showPercentage?: boolean;
  height?: number;
  color?: string;
  backgroundColor?: string;
}

export const TaskProgressBar: React.FC<TaskProgressBarProps> = ({
  progress,
  showPercentage = true,
  height = 8,
  color = '#10b981',
  backgroundColor = '#e5e7eb',
}) => {
  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);

  // Determine color based on progress
  const getProgressColor = () => {
    if (normalizedProgress === 100) return '#10b981'; // green
    if (normalizedProgress >= 75) return '#3b82f6'; // blue
    if (normalizedProgress >= 50) return '#f59e0b'; // orange
    if (normalizedProgress >= 25) return '#ef4444'; // red
    return '#9ca3af'; // gray
  };

  const progressColor = color || getProgressColor();

  return (
    <View style={styles.container}>
      <View style={[styles.barContainer, { height, backgroundColor }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${normalizedProgress}%`,
              backgroundColor: progressColor,
              height,
            },
          ]}
        />
      </View>
      {showPercentage && (
        <Text style={[styles.percentageText, { color: progressColor }]}>
          {normalizedProgress}%
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
});
