/**
 * Zoom Settings Content
 * Контент для настройки масштаба интерфейса (только Electron)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { getElectronAPI } from '@shared/utils/platform';

type ZoomLevel = 'small' | 'standard' | 'large';

interface ZoomOption {
  value: ZoomLevel;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const zoomOptions: ZoomOption[] = [
  {
    value: 'small',
    label: 'Маленький',
    icon: 'remove-circle-outline',
    description: 'Уменьшенный масштаб интерфейса (90%)',
  },
  {
    value: 'standard',
    label: 'Стандартный',
    icon: 'resize-outline',
    description: 'Масштаб по умолчанию (100%)',
  },
  {
    value: 'large',
    label: 'Большой',
    icon: 'add-circle-outline',
    description: 'Увеличенный масштаб интерфейса (110%)',
  },
];

const ZoomSettingsContent: React.FC = () => {
  const { theme } = useTheme();
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('standard');

  useEffect(() => {
    const electron = getElectronAPI();
    if (electron?.zoom) {
      electron.zoom.getLevel().then((level: ZoomLevel) => {
        setCurrentZoom(level || 'standard');
      });
    }
  }, []);

  const handleZoomChange = async (level: ZoomLevel) => {
    const electron = getElectronAPI();
    if (electron?.zoom) {
      const result = await electron.zoom.setLevel(level);
      if (result.success) {
        setCurrentZoom(level);
      }
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      gap: 12,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderRadius: 16,
      borderWidth: 2,
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    optionCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    iconContainerActive: {
      backgroundColor: theme.primary + '20',
    },
    iconContainerInactive: {
      backgroundColor: theme.background,
    },
    textContainer: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    optionDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    checkIcon: {
      marginLeft: 12,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {zoomOptions.map((option) => {
        const isActive = currentZoom === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              dynamicStyles.optionCard,
              isActive && dynamicStyles.optionCardActive,
            ]}
            onPress={() => handleZoomChange(option.value)}
            activeOpacity={0.7}
          >
            <View
              style={[
                dynamicStyles.iconContainer,
                isActive ? dynamicStyles.iconContainerActive : dynamicStyles.iconContainerInactive,
              ]}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={isActive ? theme.primary : theme.textSecondary}
              />
            </View>

            <View style={dynamicStyles.textContainer}>
              <Text style={dynamicStyles.optionLabel}>{option.label}</Text>
              <Text style={dynamicStyles.optionDescription}>{option.description}</Text>
            </View>

            {isActive && (
              <Ionicons
                name="checkmark-circle"
                size={28}
                color={theme.primary}
                style={dynamicStyles.checkIcon}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default ZoomSettingsContent;
