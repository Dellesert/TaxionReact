/**
 * About Footer Component
 * Футер с копирайтом для экрана "О приложении"
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface AboutFooterProps {
  copyrightText: string;
}

export const AboutFooter: React.FC<AboutFooterProps> = ({ copyrightText }) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    text: {
      color: theme.textTertiary,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.text, dynamicStyles.text]}>{copyrightText}</Text>
      <Text style={[styles.text, dynamicStyles.text]}>Все права защищены</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  text: {
    fontSize: 12,
    marginTop: 4,
  },
});
