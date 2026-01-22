import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@shared/components/common/Avatar';
import { useTheme } from '@shared/hooks/useTheme';
import { User } from '@/types/user.types';
import { getRoleIcon, getRoleIconColor } from '../../utils/profileHelpers';

interface ProfileHeaderProps {
  user: User;
}

/**
 * Profile header component with avatar and user info
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Initialize opacity to 1 if department already exists (from cache), otherwise 0
  const departmentOpacity = useRef(new Animated.Value(user.department ? 1 : 0)).current;

  useEffect(() => {
    if (user.department) {
      // Only animate if currently invisible
      Animated.timing(departmentOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [user.department]);

  // Pre-calculate top padding to prevent layout shift on iOS
  // Only apply safe area top padding on native platforms
  const topPadding = Platform.OS !== 'web' ? insets.top : 0;

  const roleIcon = getRoleIcon(user);
  const roleIconColor = getRoleIconColor(user);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.primary,
      paddingTop: topPadding + 16,
      paddingHorizontal: 16,
      paddingBottom: 24,
      marginBottom: 0,
      alignItems: 'center',
      // Reserve minimum height to prevent layout shift
      minHeight: 220 + topPadding,
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
      // Ensure avatar container has fixed size to prevent layout shift
      width: 100,
      height: 100,
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
      minHeight: 26,
    },
    departmentText: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '500',
      lineHeight: 18,
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
        thumbnailUrl={user.avatar_thumbnail}
        name={user.name || user.email}
        size={100}
        useOriginal={true}
        userId={user.id}
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
        <Animated.View style={[dynamicStyles.departmentBadge, { opacity: departmentOpacity }]}>
          <Text style={dynamicStyles.departmentText}>{user.department.name}</Text>
        </Animated.View>
      )}
      {user.position && <Text style={dynamicStyles.userPosition}>{user.position}</Text>}
    </View>
  );
};
