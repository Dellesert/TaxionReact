/**
 * Change Avatar Content
 * Контент для изменения аватара
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { Avatar } from '@shared/components/common/Avatar';

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
    avatarWrapper: {
      marginBottom: 32,
      borderWidth: 4,
      borderRadius: 80,
      borderColor: theme.border,
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

  return (
    <View style={dynamicStyles.container}>
      {/* Avatar Preview */}
      <Avatar
        style={dynamicStyles.avatarWrapper}
        imageUrl={user?.avatar}
        thumbnailUrl={user?.avatar_thumbnail}
        name={user?.name || user?.email || 'User'}
        size={160}
        useOriginal={true}
        userId={user?.id}
      />

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
              {user?.avatar ? 'Изменить фото' : 'Загрузить фото'}
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
