import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface PollVotersHeaderProps {
  onBack: () => void;
}

export const PollVotersHeader: React.FC<PollVotersHeaderProps> = ({ onBack }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.background, borderBottomColor: theme.border },
      ]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>
        Кто проголосовал
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
});
