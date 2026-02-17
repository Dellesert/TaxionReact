/**
 * About Content
 * Полная логика экрана "О приложении" без header
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAboutActions } from '../../hooks/useAboutActions';
import { useElectronVersion } from '../../hooks/useElectronVersion';
import { AboutLogo } from '../about/AboutLogo';
import { AboutSection } from '../about/AboutSection';
import { AboutInfoRow } from '../about/AboutInfoRow';
import { AboutContactLink } from '../about/AboutContactLink';
import { AboutFooter } from '../about/AboutFooter';
import {
  APP_NAME,
  COMPANY_NAME,
  APP_DESCRIPTION,
  CONTACT_LINKS,
} from '../../utils/aboutConstants';
import { formatVersionText, formatCopyrightText, getPlatformName } from '../../utils/aboutHelpers';

// Check if running in Electron
const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).electron;

const AboutContent: React.FC = () => {
  const { theme } = useTheme();
  const { handleOpenWebsite, handleOpenEmail } = useAboutActions();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // Get version from Electron or native
  const { version: appVersion, build: appBuild } = useElectronVersion();

  const handleContactPress = (action: 'website' | 'email') => {
    if (action === 'website') {
      handleOpenWebsite();
    } else {
      handleOpenEmail();
    }
  };

  const handleCheckUpdate = useCallback(async () => {
    if (!isElectron) return;

    setIsCheckingUpdate(true);
    setUpdateStatus(null);

    try {
      const electron = (window as any).electron;
      const result = await electron.updater.checkForUpdates(false);

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
      // Clear status after 5 seconds
      setTimeout(() => setUpdateStatus(null), 5000);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          <AboutInfoRow label="Платформа" value={getPlatformName()} isLast={!isElectron} />

          {/* Update check button - only in Electron */}
          {isElectron && (
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

export default AboutContent;
