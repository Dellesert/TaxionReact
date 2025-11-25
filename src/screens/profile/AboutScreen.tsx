/**
 * About Screen (Refactored)
 * Экран "О приложении" с информацией о приложении
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Platform, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

// Custom Hooks
import { useAboutActions } from '@hooks/useAboutActions';

// Components
import { AboutLogo } from './components/about/AboutLogo';
import { AboutSection } from './components/about/AboutSection';
import { AboutFeatureItem } from './components/about/AboutFeatureItem';
import { AboutInfoRow } from './components/about/AboutInfoRow';
import { AboutContactLink } from './components/about/AboutContactLink';
import { AboutFooter } from './components/about/AboutFooter';

// Utils
import {
  APP_VERSION,
  APP_BUILD,
  APP_NAME,
  COMPANY_NAME,
  APP_DESCRIPTION,
  APP_FEATURES,
  CONTACT_LINKS,
} from '@utils/aboutConstants';
import { formatVersionText, formatCopyrightText, getPlatformName } from '@utils/aboutHelpers';

export default function AboutScreen() {
  const navigation = useNavigation();
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
});
