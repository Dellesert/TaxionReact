import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserRole } from '@/types/user.types';
import { getRoleLabel, getRoleColor } from '../../utils/roleHelpers';

interface UserRoleBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium' | 'large';
}

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role, size = 'medium' }) => {
  const backgroundColor = getRoleColor(role);
  const label = getRoleLabel(role);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 };
      case 'large':
        return { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 };
      case 'medium':
      default:
        return { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: sizeStyles.fontSize }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
