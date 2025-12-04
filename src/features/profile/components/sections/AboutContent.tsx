/**
 * About Content
 * Полная логика экрана "О приложении" без header
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Platform, Text } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAboutActions } from '../../hooks/useAboutActions';
import { AboutLogo } from '../about/AboutLogo';
import { AboutSection } from '../about/AboutSection';
import { AboutFeatureItem } from '../about/AboutFeatureItem';
import { AboutInfoRow } from '../about/AboutInfoRow';
import { AboutContactLink } from '../about/AboutContactLink';
import { AboutFooter } from '../about/AboutFooter';
import {
  APP_VERSION,
  APP_BUILD,
  APP_NAME,
  COMPANY_NAME,
  APP_DESCRIPTION,
  APP_FEATURES,
  CONTACT_LINKS,
} from '../../utils/aboutConstants';
import { formatVersionText, formatCopyrightText, getPlatformName } from '../../utils/aboutHelpers';

const AboutContent: React.FC = () => {
  const { theme } = useTheme();
  const { handleOpenWebsite, handleOpenEmail } = useAboutActions();

  const handleContactPress = (action: 'website' | 'email') => {
    if (action === 'website') {
      handleOpenWebsite();
    } else {
      handleOpenEmail();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <AboutLogo appName={APP_NAME} versionText={formatVersionText(APP_VERSION, APP_BUILD)} />

        {/* Description Section */}
        <AboutSection title="О приложении">
          <Text style={[styles.descriptionText, { color: theme.text }]}>{APP_DESCRIPTION}</Text>
        </AboutSection>

        {/* Features Section */}
        <AboutSection title="Возможности">
          {APP_FEATURES.map((feature, index) => (
            <AboutFeatureItem
              key={feature.text}
              icon={feature.icon}
              text={feature.text}
              isLast={index === APP_FEATURES.length - 1}
            />
          ))}
        </AboutSection>

        {/* App Info Section */}
        <AboutSection title="Информация">
          <AboutInfoRow label="Версия" value={APP_VERSION} />
          <AboutInfoRow label="Сборка" value={APP_BUILD} />
          <AboutInfoRow label="Платформа" value={getPlatformName()} isLast />
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
});

export default AboutContent;
