import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExpandAllSubtasksButtonProps {
  expanded: boolean;
  count: number;
  onToggle: () => void;
}

export const ExpandAllSubtasksButton: React.FC<ExpandAllSubtasksButtonProps> = ({
  expanded,
  count,
  onToggle,
}) => {
  if (count === 0) return null;

  const styles = StyleSheet.create({
    expandAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: 'transparent',
    },
    expandAllText: {
      fontSize: 13,
      fontWeight: '500',
      color: '#6b7280',
    },
  });

  return (
    <TouchableOpacity
      style={styles.expandAllButton}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={18}
        color="#6b7280"
      />
      <Text style={styles.expandAllText}>
        {expanded ? 'Свернуть все подзадачи' : 'Развернуть все подзадачи'} ({count})
      </Text>
    </TouchableOpacity>
  );
};
