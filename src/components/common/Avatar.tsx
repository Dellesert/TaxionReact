/**
 * Avatar Component
 * Компонент аватара пользователя
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useAuthStore } from '@store/authStore';
import { API_BASE_URL } from '@constants/api.constants';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: number;
  status?: 'online' | 'offline' | 'busy' | 'away';
  showStatus?: boolean;
  style?: ViewStyle;
}

const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  imageUrl,
  size = 40,
  status,
  showStatus = false,
  style,
}) => {
  const [imageError, setImageError] = useState(false);
  const token = useAuthStore((state) => state.tokens?.accessToken);

  // Prepare image source with headers if needed
  const imageSource = useMemo(() => {
    if (!imageUrl) return null;

    let fixedUrl = imageUrl;

    // Replace localhost with configured API base URL for iOS/Android devices
    // This is needed because avatar URLs might be saved in DB with localhost
    // which doesn't work on mobile devices (localhost = device itself, not Mac)
    // On production, this won't be needed as all URLs will use proper domain
    if (fixedUrl.includes('localhost')) {
      // Extract base URL without /api/v1 suffix
      const baseUrl = API_BASE_URL.replace('/api/v1', '');
      fixedUrl = fixedUrl.replace(/http:\/\/localhost:8080/, baseUrl);
    }

    // If it's a public URL or already includes full path, use it directly
    if (fixedUrl.startsWith('http://') || fixedUrl.startsWith('https://')) {
      return {
        uri: fixedUrl,
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : undefined,
      };
    }

    // Otherwise, it might be a relative path - use as is
    return { uri: fixedUrl };
  }, [imageUrl, token]);

  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'online':
        return '#10B981';
      case 'busy':
        return '#EF4444';
      case 'away':
        return '#F59E0B';
      case 'offline':
      default:
        return '#9CA3AF';
    }
  };

  const avatarSize = { width: size, height: size, borderRadius: size / 2 };
  const statusSize = size * 0.25;
  const statusPosition = {
    width: statusSize,
    height: statusSize,
    borderRadius: statusSize / 2,
    bottom: 0,
    right: 0,
  };

  // Check if we should show the image or fallback to initials
  const shouldShowImage = imageSource && !imageError;

  return (
    <View style={[styles.container, style]}>
      {shouldShowImage ? (
        <Image
          source={imageSource}
          style={[styles.avatar, avatarSize]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={(error) => {
            console.log('❌ Avatar load error:', imageUrl, error);
            setImageError(true);
          }}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, avatarSize]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {showStatus && status && (
        <View
          style={[
            styles.status,
            statusPosition,
            { backgroundColor: getStatusColor() },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e04f4fff',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  status: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export { Avatar };
export default Avatar;
