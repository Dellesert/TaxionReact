import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface FloatingDateHeaderProps {
  dateLabel: string | null;
  visible: boolean;
}

/**
 * Компонент плавающего заголовка с датой при прокрутке
 */
export const FloatingDateHeader: React.FC<FloatingDateHeaderProps> = ({
  dateLabel,
  visible,
}) => {
  const { theme } = useTheme();

  if (!visible || !dateLabel) return null;

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.backgroundSecondary }
    ]}>
      <Text style={[styles.text, { color: theme.text }]}>
        {dateLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 998,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
