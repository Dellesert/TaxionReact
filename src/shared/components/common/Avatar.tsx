/**
 * Avatar Component
 * Компонент аватара пользователя
 */

import React, { useState, useMemo, ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { API_BASE_URL } from '@shared/constants/api.constants';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  thumbnailUrl?: string; // Thumbnail URL for small avatars (400x300px)
  size?: number;
  status?: 'online' | 'offline' | 'busy' | 'away';
  showStatus?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
  userId?: number;
  badge?: ReactNode; // Custom badge component to show in bottom-right corner
  badgeStyle?: ViewStyle;
  useOriginal?: boolean; // Force use of original avatar (for profile page)
}

const AvatarComponent: React.FC<AvatarProps> = ({
  name = 'User',
  imageUrl,
  thumbnailUrl,
  size = 40,
  status,
  showStatus = false,
  style,
  onPress,
  userId,
  badge,
  badgeStyle,
  useOriginal = false,
}) => {
  const [imageError, setImageError] = useState(false);

  // Prepare final URL to use (stable string reference)
  const finalUrl = useMemo(() => {
    // Decide which URL to use:
    // - If useOriginal=true (profile page) -> use original avatar
    // - If size <= 100px (chat, lists) -> use thumbnail (if available)
    // - Otherwise -> use original
    const shouldUseThumbnail = !useOriginal && size <= 100 && thumbnailUrl;
    const url = shouldUseThumbnail ? thumbnailUrl : imageUrl;

    if (!url) return null;

    let fixedUrl = url;

    // Replace localhost with configured API base URL for iOS/Android devices
    // This is needed because avatar URLs might be saved in DB with localhost
    // which doesn't work on mobile devices (localhost = device itself, not Mac)
    // On production, this won't be needed as all URLs will use proper domain
    if (fixedUrl.includes('localhost')) {
      // Extract base URL without /api/v1 suffix
      const baseUrl = API_BASE_URL.replace('/api/v1', '');
      fixedUrl = fixedUrl.replace(/http:\/\/localhost:8080/, baseUrl);
    }

    return fixedUrl;
  }, [imageUrl, thumbnailUrl, useOriginal, size]);

  // Prepare image source with headers if needed
  // OPTIMIZATION: Use stable object reference by stringifying for cache key
  const imageSource = useMemo(() => {
    if (!finalUrl) return null;

    // If it's a public URL or already includes full path, return string directly
    // expo-image will handle auth headers via Image.prefetch or global headers
    if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) {
      return finalUrl;
    }

    // Otherwise, it might be a relative path - use as is
    return finalUrl;
  }, [finalUrl]);

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

  const avatarContent = (
    <>
      {shouldShowImage ? (
        <Image
          source={imageSource}
          style={[styles.avatar, avatarSize]}
          contentFit="cover"
          transition={100}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          placeholderContentFit="cover"
          priority="low"
          recyclingKey={userId ? `avatar-${userId}` : imageSource}
          responsivePolicy="initial"
          allowDownscaling={true}
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

      {badge && (
        <View
          style={[
            styles.badge,
            statusPosition,
            badgeStyle,
          ]}
        >
          {badge}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {avatarContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {avatarContent}
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
  badge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Memoize Avatar component to prevent unnecessary re-renders
const Avatar = React.memo(AvatarComponent, (prevProps, nextProps) => {
  // Check if any prop that affects rendering has changed
  return (
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.thumbnailUrl === nextProps.thumbnailUrl &&
    prevProps.name === nextProps.name &&
    prevProps.size === nextProps.size &&
    prevProps.status === nextProps.status &&
    prevProps.showStatus === nextProps.showStatus &&
    prevProps.userId === nextProps.userId &&
    prevProps.useOriginal === nextProps.useOriginal &&
    prevProps.badge === nextProps.badge
  );
});

export { Avatar };
export default Avatar;
