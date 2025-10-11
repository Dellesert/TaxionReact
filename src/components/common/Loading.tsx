/**
 * Loading Component
 * Компонент индикатора загрузки
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';

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
  color = '#DC2626',
  fullScreen = false,
  style,
}) => {
  const containerStyle = fullScreen ? styles.fullScreen : styles.inline;

  return (
    <View style={[containerStyle, style]}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
});

export { Loading };
export default Loading;
