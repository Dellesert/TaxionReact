/**
 * AboutScreen
 * Экран "О приложении" с информацией о приложении
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

const APP_VERSION = '1.0.0';
const APP_BUILD = '1';
const APP_NAME = 'Tachyon Messenger';
const COMPANY_NAME = 'Tachyon Technologies';
const SUPPORT_EMAIL = 'support@tachyon.com';
const WEBSITE_URL = 'https://tachyon.com';

export default function AboutScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const handleOpenWebsite = async () => {
    try {
      await Linking.openURL(WEBSITE_URL);
    } catch (error) {
      console.error('Failed to open website:', error);
    }
  };

  const handleOpenEmail = async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    } catch (error) {
      console.error('Failed to open email:', error);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 12,
      padding: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    content: {
      flex: 1,
    },
    logoSection: {
      alignItems: 'center',
      paddingVertical: 40,
      backgroundColor: theme.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    logoContainer: {
      width: 100,
      height: 100,
      borderRadius: 24,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    appName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    versionText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    section: {
      backgroundColor: theme.backgroundSecondary,
      marginTop: 16,
      marginHorizontal: 16,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: isDark ? 0 : 1,
      borderColor: isDark ? 'transparent' : theme.borderLight,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? theme.background : theme.backgroundSecondary,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    descriptionText: {
      fontSize: 15,
      color: theme.text,
      lineHeight: 22,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      backgroundColor: theme.backgroundSecondary,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuItemText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      color: theme.text,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoLabel: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    infoValue: {
      fontSize: 15,
      color: theme.text,
      fontWeight: '500',
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    copyrightText: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 4,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={dynamicStyles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>О приложении</Text>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={dynamicStyles.logoSection}>
          <View style={dynamicStyles.logoContainer}>
            <Ionicons name="flash" size={50} color="#FFFFFF" />
          </View>
          <Text style={dynamicStyles.appName}>{APP_NAME}</Text>
          <Text style={dynamicStyles.versionText}>
            Версия {APP_VERSION} ({APP_BUILD})
          </Text>
        </View>

        {/* Description Section */}
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>О приложении</Text>
          </View>
          <Text style={dynamicStyles.descriptionText}>
            {APP_NAME} — современный корпоративный мессенджер с функциями управления задачами,
            опросами и календарем событий. Приложение разработано для эффективной коммуникации
            внутри организации и повышения продуктивности команды.
          </Text>
        </View>

        {/* Features Section */}
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Возможности</Text>
          </View>
          <View style={dynamicStyles.menuItem}>
            <Ionicons name="chatbubbles" size={20} color={theme.primary} />
            <Text style={dynamicStyles.menuItemText}>Личные и групповые чаты</Text>
          </View>
          <View style={dynamicStyles.menuItem}>
            <Ionicons name="checkbox" size={20} color={theme.primary} />
            <Text style={dynamicStyles.menuItemText}>Управление задачами</Text>
          </View>
          <View style={dynamicStyles.menuItem}>
            <Ionicons name="bar-chart" size={20} color={theme.primary} />
            <Text style={dynamicStyles.menuItemText}>Опросы и голосования</Text>
          </View>
          <View style={dynamicStyles.menuItem}>
            <Ionicons name="calendar" size={20} color={theme.primary} />
            <Text style={dynamicStyles.menuItemText}>Календарь событий</Text>
          </View>
          <View style={[dynamicStyles.menuItem, dynamicStyles.menuItemLast]}>
            <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
            <Text style={dynamicStyles.menuItemText}>Безопасная аутентификация</Text>
          </View>
        </View>

        {/* App Info Section */}
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Информация</Text>
          </View>
          <View style={dynamicStyles.infoRow}>
            <Text style={dynamicStyles.infoLabel}>Версия</Text>
            <Text style={dynamicStyles.infoValue}>{APP_VERSION}</Text>
          </View>
          <View style={dynamicStyles.infoRow}>
            <Text style={dynamicStyles.infoLabel}>Сборка</Text>
            <Text style={dynamicStyles.infoValue}>{APP_BUILD}</Text>
          </View>
          <View style={[dynamicStyles.infoRow, dynamicStyles.infoRowLast]}>
            <Text style={dynamicStyles.infoLabel}>Платформа</Text>
            <Text style={dynamicStyles.infoValue}>
              {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}
            </Text>
          </View>
        </View>

        {/* Contact Section */}
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Контакты</Text>
          </View>
          <TouchableOpacity
            style={dynamicStyles.menuItem}
            onPress={handleOpenWebsite}
          >
            <Ionicons name="globe-outline" size={20} color={theme.primary} />
            <Text style={dynamicStyles.menuItemText}>Веб-сайт</Text>
            <Ionicons name="open-outline" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.menuItem, dynamicStyles.menuItemLast]}
            onPress={handleOpenEmail}
          >
            <Ionicons name="mail-outline" size={20} color={theme.primary} />
            <Text style={dynamicStyles.menuItemText}>Поддержка</Text>
            <Ionicons name="open-outline" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={dynamicStyles.footer}>
          <Text style={dynamicStyles.copyrightText}>© 2025 {COMPANY_NAME}</Text>
          <Text style={dynamicStyles.copyrightText}>Все права защищены</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
