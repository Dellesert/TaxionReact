import React, { useState } from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface SpoilerTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/**
 * Спойлер — скрытый текст, который открывается по нажатию.
 * Реализован через inline <Text>: в скрытом состоянии текст прозрачный
 * с серым фоном, по нажатию — обычный текст без фона.
 */
export const SpoilerText: React.FC<SpoilerTextProps> = ({ children, style }) => {
  const [revealed, setRevealed] = useState(false);
  const { isDark } = useTheme();

  const hiddenBg = isDark ? '#4B5563' : '#D1D5DB';

  return (
    <Text
      onPress={() => setRevealed(prev => !prev)}
      style={[
        style,
        styles.base,
        !revealed && { color: 'transparent', backgroundColor: hiddenBg },
        revealed && styles.revealed,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 4,
  },
  revealed: {
    backgroundColor: 'transparent',
  },
});
