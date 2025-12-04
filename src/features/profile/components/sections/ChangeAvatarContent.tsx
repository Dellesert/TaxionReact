/**
 * Change Avatar Content
 * Контент для изменения аватара
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { API_BASE_URL } from '@shared/constants/api.constants';

interface ChangeAvatarContentProps {
  isUploadingAvatar: boolean;
  handleChangeAvatar: () => void;
}

const ChangeAvatarContent: React.FC<ChangeAvatarContentProps> = ({
  isUploadingAvatar,
  handleChangeAvatar,
}) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const dynamicStyles = StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    avatarContainer: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
      overflow: 'hidden',
      borderWidth: 4,
      borderColor: theme.border,
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholderText: {
      fontSize: 56,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    changeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      backgroundColor: theme.primary,
      minWidth: 200,
      justifyContent: 'center',
    },
    changeButtonDisabled: {
      opacity: 0.6,
    },
    changeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 8,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 24,
      maxWidth: 400,
      lineHeight: 20,
    },
  });

  const avatarUrl = user?.avatar
    ? `${API_BASE_URL}${user.avatar}`
    : null;

  const avatarInitial = user?.name?.charAt(0).toUpperCase() || '?';

  return (
    <View style={dynamicStyles.container}>
      {/* Avatar Preview */}
      <View style={dynamicStyles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={dynamicStyles.avatar} />
        ) : (
          <Text style={dynamicStyles.avatarPlaceholderText}>{avatarInitial}</Text>
        )}
      </View>

      {/* Change Button */}
      <TouchableOpacity
        style={[
          dynamicStyles.changeButton,
          isUploadingAvatar && dynamicStyles.changeButtonDisabled,
        ]}
        onPress={handleChangeAvatar}
        disabled={isUploadingAvatar}
        activeOpacity={0.8}
      >
        {isUploadingAvatar ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={dynamicStyles.changeButtonText}>
              {avatarUrl ? 'Изменить фото' : 'Загрузить фото'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Info Text */}
      <Text style={dynamicStyles.infoText}>
        Рекомендуемый размер: 400x400 пикселей. Поддерживаемые форматы: JPG, PNG.
        Максимальный размер файла: 5 МБ.
      </Text>
    </View>
  );
};

export default ChangeAvatarContent;
