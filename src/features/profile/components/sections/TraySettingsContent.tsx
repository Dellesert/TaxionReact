/**
 * Tray Settings Content
 * Контент для настройки поведения при закрытии окна (Electron)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

// CloseBehavior type from electron.d.ts
type CloseBehavior = 'minimize' | 'quit' | null;

interface TrayOption {
  value: CloseBehavior;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const TraySettingsContent: React.FC = () => {
  const { theme } = useTheme();
  const [closeBehavior, setCloseBehavior] = useState<CloseBehavior>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Only available in Electron
  const isElectron = Platform.OS === 'web' && window.electron;

  useEffect(() => {
    if (isElectron) {
      loadCloseBehavior();
    }
  }, [isElectron]);

  const loadCloseBehavior = async () => {
    try {
      const behavior = await window.electron?.tray.getCloseBehavior();
      setCloseBehavior(behavior ?? null);
    } catch (error) {
      console.error('[TraySettings] Error loading close behavior:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCloseBehavior = async (behavior: CloseBehavior) => {
    if (!isElectron || isSaving) return;

    setIsSaving(true);
    try {
      const result = await window.electron?.tray.setCloseBehavior(behavior);
      if (result?.success) {
        setCloseBehavior(behavior);
      } else {
        console.error('[TraySettings] Error setting close behavior:', result?.error);
      }
    } catch (error) {
      console.error('[TraySettings] Error setting close behavior:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const trayOptions: TrayOption[] = [
    {
      value: 'minimize',
      label: 'Свернуть в трей',
      icon: 'remove-circle-outline',
      description: 'Приложение будет свернуто в системный трей и продолжит работу в фоне',
    },
    {
      value: 'quit',
      label: 'Закрыть приложение',
      icon: 'close-circle-outline',
      description: 'Приложение будет полностью закрыто',
    },
    {
      value: null,
      label: 'Спрашивать каждый раз',
      icon: 'help-circle-outline',
      description: 'При закрытии будет показан диалог с выбором действия',
    },
  ];

  if (!isElectron) {
    return (
      <View style={[styles.notAvailableContainer, { backgroundColor: theme.card }]}>
        <Ionicons name="desktop-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.notAvailableTitle, { color: theme.text }]}>
          Недоступно
        </Text>
        <Text style={[styles.notAvailableText, { color: theme.textSecondary }]}>
          Эта настройка доступна только в десктопной версии приложения
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      gap: 12,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: theme.card,
      borderColor: theme.border,
      // @ts-ignore
      cursor: 'pointer',
    },
    optionCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
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
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
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
      {trayOptions.map((option) => {
        const isActive = closeBehavior === option.value;

        return (
          <TouchableOpacity
            key={String(option.value)}
            style={[
              dynamicStyles.optionCard,
              isActive && dynamicStyles.optionCardActive,
            ]}
            onPress={() => handleSetCloseBehavior(option.value)}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <View
              style={[
                dynamicStyles.iconContainer,
                isActive ? dynamicStyles.iconContainerActive : dynamicStyles.iconContainerInactive,
              ]}
            >
              <Ionicons
                name={option.icon}
                size={18}
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
                size={20}
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

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notAvailableContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notAvailableTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 8,
  },
  notAvailableText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TraySettingsContent;
