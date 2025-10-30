import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';

interface ImageViewerProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

/**
 * Компонент для полноэкранного просмотра изображения
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({ visible, imageUrl, onClose }) => {
  const { theme } = useTheme();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      const authToken = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      setToken(authToken);
    };
    loadToken();
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={95} style={styles.blurOverlay} tint="dark">
        <Pressable
          style={styles.imageViewerOverlay}
          onPress={onClose}
        >
          <View style={styles.imageViewerContainer}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            {imageUrl && (
              <Image
                source={{
                  uri: imageUrl,
                  headers: token ? {
                    'Authorization': `Bearer ${token}`,
                  } : undefined,
                }}
                style={styles.fullscreenImage}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
              />
            )}
          </View>
        </Pressable>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurOverlay: {
    flex: 1,
  },
  imageViewerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
