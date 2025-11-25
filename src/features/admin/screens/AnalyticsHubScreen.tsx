/**
 * Analytics Hub Screen
 * Главный экран аналитики с навигацией по разделам
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';

const AnalyticsHubScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();

  const sections = [
    {
      id: 'metrics',
      title: 'Основные показатели',
      subtitle: 'Ключевые метрики системы',
      icon: 'bar-chart',
      color: '#3B82F6',
      route: 'MetricsAnalytics',
    },
    {
      id: 'performance',
      title: 'Топ сотрудников',
      subtitle: 'Лучшие по производительности',
      icon: 'trophy',
      color: '#F59E0B',
      route: 'PerformanceAnalytics',
    },
    {
      id: 'departments',
      title: 'Статистика отделов',
      subtitle: 'Эффективность работы отделов',
      icon: 'business',
      color: '#10B981',
      route: 'DepartmentsAnalytics',
    },
    {
      id: 'security',
      title: 'Безопасность',
      subtitle: 'Подозрительная активность',
      icon: 'shield-checkmark',
      color: '#EF4444',
      route: 'SecurityAnalytics',
    },
  ];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? theme.background : '#F3F4F6',
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButton: {
      position: 'absolute',
      left: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: Platform.OS === 'web' ? 100 : Platform.OS === 'ios' ? 120 : 32,
    },
    sectionCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 12,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionTextContainer: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    chevron: {
      marginLeft: 'auto',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Аналитика</Text>
        </View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={dynamicStyles.scrollContent}>
        {/* Section Cards */}
        {sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={dynamicStyles.sectionCard}
            onPress={() => navigation.navigate(section.route)}
            activeOpacity={0.7}
          >
            <View style={dynamicStyles.sectionHeader}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: section.color }]}>
                <Ionicons name={section.icon as any} size={28} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.sectionTextContainer}>
                <Text style={dynamicStyles.sectionTitle}>{section.title}</Text>
                <Text style={dynamicStyles.sectionSubtitle}>{section.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={theme.textTertiary}
                style={dynamicStyles.chevron}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default AnalyticsHubScreen;
