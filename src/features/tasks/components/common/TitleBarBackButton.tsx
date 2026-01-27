/**
 * TitleBarBackButton
 * Компактная кнопка "Назад" для отображения в Electron TitleBar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface TitleBarBackButtonProps {
  onGoBack: () => void;
  label?: string;
}

export const TitleBarBackButton: React.FC<TitleBarBackButtonProps> = ({
  onGoBack,
  label = 'Назад',
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.button, { borderColor: theme.border }]}
      // @ts-ignore - Web-only event handlers
      onClick={onGoBack}
      onMouseEnter={(e: any) => {
        if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
      }}
      onMouseLeave={(e: any) => {
        if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Ionicons name="arrow-back" size={12} color={theme.text} />
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  buttonText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
