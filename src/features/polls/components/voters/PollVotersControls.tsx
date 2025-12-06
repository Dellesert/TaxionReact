import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ViewMode } from '../../hooks/usePollVotersData';

interface PollVotersControlsProps {
  totalVoters: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const PollVotersControls: React.FC<PollVotersControlsProps> = ({
  totalVoters,
  viewMode,
  onViewModeChange,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.controls,
        { backgroundColor: theme.background, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
          Всего проголосовало: {totalVoters}
        </Text>
      </View>

      <View
        style={[styles.viewModeSwitch, { backgroundColor: theme.backgroundSecondary }]}
      >
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'users' && { backgroundColor: theme.primary },
          ]}
          onPress={() => onViewModeChange('users')}
        >
          <Ionicons
            name="people"
            size={18}
            color={viewMode === 'users' ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              { color: viewMode === 'users' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Пользователи
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'options' && { backgroundColor: theme.primary },
          ]}
          onPress={() => onViewModeChange('options')}
        >
          <Ionicons
            name="list"
            size={18}
            color={viewMode === 'options' ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              { color: viewMode === 'options' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            По вариантам
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controls: {
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  summary: {
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewModeSwitch: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
