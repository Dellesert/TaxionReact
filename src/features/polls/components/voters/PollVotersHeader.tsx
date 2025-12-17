import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { spacing, hitSlop } from '@shared/constants/design-system.constants';

interface PollVotersHeaderProps {
  onBack: () => void;
}

export const PollVotersHeader: React.FC<PollVotersHeaderProps> = ({ onBack }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border },
      ]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={hitSlop.md}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={theme.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>
        Кто проголосовал
      </Text>
      <View style={styles.placeholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
});
