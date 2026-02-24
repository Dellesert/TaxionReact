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
        return { paddingHorizontal: 6, paddingVertical: 2, fontSize: 11 };
      case 'large':
        return { paddingHorizontal: 10, paddingVertical: 6, fontSize: 13 };
      case 'medium':
      default:
        return { paddingHorizontal: 10, paddingVertical: 6, fontSize: 13 };
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
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 18,
  },
});
