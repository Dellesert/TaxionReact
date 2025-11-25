/**
 * Loading Component
 * Компонент индикатора загрузки
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface LoadingProps {
  text?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

const Loading: React.FC<LoadingProps> = ({
  text,
  size = 'large',
  color,
  fullScreen = false,
  style,
}) => {
  const { theme } = useTheme();
  const containerStyle = fullScreen
    ? [styles.fullScreen, { backgroundColor: theme.background }]
    : styles.inline;
  const indicatorColor = color || theme.primary;

  return (
    <View style={[containerStyle, style]}>
      <ActivityIndicator size={size} color={indicatorColor} />
      {text && <Text style={[styles.text, { color: theme.text }]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
  },
});

export { Loading };
export default Loading;
