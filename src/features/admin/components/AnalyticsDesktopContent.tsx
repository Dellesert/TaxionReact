/**
 * Analytics Desktop Content
 * Адаптированная версия аналитики для desktop с современным UX/UI
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNavigation } from '@react-navigation/native';

const AnalyticsDesktopContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const handleNavigate = (route: string) => {
    // Navigate within Admin stack
    navigation.navigate(route);
  };

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
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingBottom: 20,
      marginHorizontal: -10,
    },
    cardWrapper: {
      width: '50%',
      paddingHorizontal: 10,
      marginBottom: 20,
    },
    card: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 12,
      elevation: 4,
      height: '100%',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
      letterSpacing: -0.3,
    },
    cardSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
  });

  return (
    <ScrollView
      style={dynamicStyles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={dynamicStyles.grid}>
        {sections.map((section) => (
          <View key={section.id} style={dynamicStyles.cardWrapper}>
            <TouchableOpacity
              style={dynamicStyles.card}
              onPress={() => handleNavigate(section.route)}
              activeOpacity={0.8}
            >
              <View style={dynamicStyles.cardHeader}>
                <View style={[dynamicStyles.iconContainer, { backgroundColor: section.color }]}>
                  <Ionicons name={section.icon as any} size={32} color="#FFFFFF" />
                </View>
                <View style={dynamicStyles.cardContent}>
                  <Text style={dynamicStyles.cardTitle}>{section.title}</Text>
                  <Text style={dynamicStyles.cardSubtitle}>{section.subtitle}</Text>
                </View>
              </View>
              <View style={dynamicStyles.cardFooter}>
                <View style={dynamicStyles.actionButton}>
                  <Text style={dynamicStyles.actionButtonText}>Открыть</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.primary} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default AnalyticsDesktopContent;
