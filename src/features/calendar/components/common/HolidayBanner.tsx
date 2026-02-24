import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface HolidayBannerProps {
  holidayName: string;
}

export const HolidayBanner: React.FC<HolidayBannerProps> = ({ holidayName }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.error + '20', borderColor: theme.error + '20' }]}
      pointerEvents="none"
    >
      <Ionicons name="gift-outline" size={14} color={theme.error} />
      <Text style={[styles.text, { color: theme.error }]} numberOfLines={1}>
        {holidayName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },
});
