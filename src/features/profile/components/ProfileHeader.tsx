import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@shared/components/common/Avatar';
import { useTheme } from '@shared/hooks/useTheme';
import { User } from '@/types/user.types';
import { getRoleIcon, getRoleIconColor } from '../utils/profileHelpers';

interface ProfileHeaderProps {
  user: User;
}

/**
 * Profile header component with avatar and user info
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const { theme } = useTheme();

  const roleIcon = getRoleIcon(user);
  const roleIconColor = getRoleIconColor(user);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.primary,
      padding: 16,
      paddingBottom: 24,
      marginBottom: 0,
      alignItems: 'center',
    },
    userAvatar: {
      borderWidth: 1,
      borderRadius: 50,
      borderColor: '#cf0000ff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    userNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      gap: 6,
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    roleIcon: {
      marginTop: 2,
    },
    userEmail: {
      fontSize: 16,
      color: '#FFFFFF',
      marginTop: 4,
    },
    departmentBadge: {
      backgroundColor: 'black',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 16,
      marginTop: 8,
    },
    departmentText: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '500',
    },
    userPosition: {
      fontSize: 14,
      color: '#FFFFFF',
      marginTop: 8,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Avatar
        style={dynamicStyles.userAvatar}
        imageUrl={user.avatar}
        name={user.name || user.email}
        size={100}
      />
      <View style={dynamicStyles.userNameRow}>
        <Text style={dynamicStyles.userName}>{user.name || 'Без имени'}</Text>
        {roleIcon && roleIconColor && (
          <Ionicons
            name={roleIcon as any}
            size={20}
            color={roleIconColor}
            style={dynamicStyles.roleIcon}
          />
        )}
      </View>
      <Text style={dynamicStyles.userEmail}>{user.email}</Text>
      {user.department && (
        <View style={dynamicStyles.departmentBadge}>
          <Text style={dynamicStyles.departmentText}>{user.department.name}</Text>
        </View>
      )}
      {user.position && <Text style={dynamicStyles.userPosition}>{user.position}</Text>}
    </View>
  );
};
