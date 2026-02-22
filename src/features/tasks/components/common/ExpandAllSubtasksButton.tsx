import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

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
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={styles.expandAllButton}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={18}
        color={theme.textSecondary}
      />
      <Text style={[styles.expandAllText, { color: theme.textSecondary }]}>
        {expanded ? 'Свернуть все подзадачи' : 'Развернуть все подзадачи'} ({count})
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  expandAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: 'transparent',
  },
  expandAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
