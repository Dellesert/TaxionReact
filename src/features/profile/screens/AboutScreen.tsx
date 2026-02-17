/**
 * About Screen (Refactored)
 * Экран "О приложении" с информацией о приложении
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

// Custom Hooks
import { useAboutActions } from '../hooks/useAboutActions';
import { useElectronVersion } from '../hooks/useElectronVersion';

// Components
import { AboutLogo } from '../components/about/AboutLogo';
import { AboutSection } from '../components/about/AboutSection';
import { AboutInfoRow } from '../components/about/AboutInfoRow';
import { AboutContactLink } from '../components/about/AboutContactLink';
import { AboutFooter } from '../components/about/AboutFooter';

// Utils
import {
  APP_NAME,
  COMPANY_NAME,
  APP_DESCRIPTION,
  CONTACT_LINKS,
} from '../utils/aboutConstants';
import { formatVersionText, formatCopyrightText, getPlatformName } from '../utils/aboutHelpers';
import { appUpdaterService } from '@/services/appUpdater.service';

const isAndroid = Platform.OS === 'android';
const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).electron;

export default function AboutScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        setStatusBarStyle(isDark ? 'light' : 'dark');
      }
    }, [isDark])
  );
  const { handleOpenWebsite, handleOpenEmail } = useAboutActions();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // Use hook for Electron version, fallback to constants for other platforms
  const electronVersion = useElectronVersion();
  const appVersion = electronVersion.version;
  const appBuild = electronVersion.build;

  const handleCheckUpdate = useCallback(async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);

    try {
      let result;

      if (isElectron) {
        // Use Electron updater
        const electron = (window as any).electron;
        result = await electron.updater.checkForUpdates(false);
      } else {
        // Use native updater service
        result = await appUpdaterService.checkForUpdates(false);
      }

      if (result.error) {
        setUpdateStatus('Ошибка проверки');
      } else if (result.hasUpdate) {
        setUpdateStatus(`Доступна версия ${result.version}`);
      } else {
        setUpdateStatus('Установлена последняя версия');
      }
    } catch (error) {
      setUpdateStatus('Ошибка проверки');
    } finally {
      setIsCheckingUpdate(false);
      setTimeout(() => setUpdateStatus(null), 5000);
    }
  }, []);

  const handleContactPress = (action: 'website' | 'email') => {
    if (action === 'website') {
      handleOpenWebsite();
    } else {
      handleOpenEmail();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        <View
          style={[
            styles.header,
            { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>О приложении</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <AboutLogo appName={APP_NAME} versionText={formatVersionText(appVersion, appBuild)} />

        {/* Description Section */}
        <AboutSection title="О приложении">
          <Text style={[styles.descriptionText, { color: theme.text }]}>{APP_DESCRIPTION}</Text>
        </AboutSection>

        {/* App Info Section */}
        <AboutSection title="Информация">
          <AboutInfoRow label="Версия" value={appVersion} />
          <AboutInfoRow label="Сборка" value={appBuild} />
          <AboutInfoRow label="Платформа" value={getPlatformName()} isLast={!isAndroid && !isElectron} />

          {/* Update check button - on Android and Electron */}
          {(isAndroid || isElectron) && (
            <TouchableOpacity
              style={[
                styles.updateButton,
                { backgroundColor: theme.backgroundSecondary, borderTopColor: theme.borderLight },
              ]}
              onPress={handleCheckUpdate}
              disabled={isCheckingUpdate}
            >
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={theme.primary} />
              )}
              <Text style={[styles.updateButtonText, { color: theme.text }]}>
                {isCheckingUpdate ? 'Проверка...' : 'Проверить обновления'}
              </Text>
              {updateStatus && (
                <Text style={[styles.updateStatus, { color: theme.textSecondary }]}>
                  {updateStatus}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </AboutSection>

        {/* Contact Section */}
        <AboutSection title="Контакты">
          {CONTACT_LINKS.map((link, index) => (
            <AboutContactLink
              key={link.action}
              icon={link.icon}
              text={link.text}
              onPress={() => handleContactPress(link.action)}
              isLast={index === CONTACT_LINKS.length - 1}
            />
          ))}
        </AboutSection>

        {/* Footer */}
        <AboutFooter copyrightText={formatCopyrightText(COMPANY_NAME)} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'web' ? 100 : Platform.OS === 'ios' ? 100 : 32,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  updateButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
  },
  updateStatus: {
    fontSize: 13,
  },
});
