/**
 * Avatar Component
 * Компонент аватара пользователя
 */

import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';

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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load image - try public endpoint first, then with authorization
  useEffect(() => {
    const loadImage = async () => {
      if (!imageUrl) {
        setBlobUrl(null);
        return;
      }

      // If it's already a blob URL, use it directly
      if (imageUrl.startsWith('blob:')) {
        setBlobUrl(imageUrl);
        return;
      }

      // If it's a public URL (contains '/public/'), use it directly without auth
      if (imageUrl.includes('/public/')) {
        setBlobUrl(imageUrl);
        return;
      }

      setIsLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setBlobUrl(null);
          setIsLoading(false);
          return;
        }

        const response = await fetch(imageUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          setBlobUrl(url);
        } else {
          console.error('Failed to load avatar:', response.status);
          setBlobUrl(null);
        }
      } catch (error) {
        console.error('Error loading avatar:', error);
        setBlobUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    // Cleanup blob URL on unmount or when imageUrl changes
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imageUrl]);

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

  return (
    <View style={[styles.container, style]}>
      {imageUrl && blobUrl ? (
        <Image source={{ uri: blobUrl }} style={[styles.avatar, avatarSize]} />
      ) : isLoading ? (
        <View style={[styles.avatar, avatarSize, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="small" color="#666" />
        </View>
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
