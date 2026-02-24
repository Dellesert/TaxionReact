/**
 * Analytics Desktop Content
 * Адаптированная версия аналитики для desktop с современным UX/UI
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNavigation } from '@react-navigation/native';

const SIDEBAR_WIDTH = 320;

const AnalyticsDesktopContent: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = windowWidth - SIDEBAR_WIDTH;
  const isNarrow = contentWidth < 600;

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
    contentWrapper: {
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
    },
    grid: {
      flexDirection: isNarrow ? 'column' : 'row',
      flexWrap: isNarrow ? undefined : 'wrap',
      paddingBottom: 20,
      marginHorizontal: isNarrow ? 0 : -12,
    },
    cardWrapper: {
      width: isNarrow ? '100%' : '50%',
      maxWidth: isNarrow ? undefined : 600,
      paddingHorizontal: isNarrow ? 0 : 12,
      marginBottom: 8,
    },
    card: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      height: '100%',
      // @ts-ignore
      cursor: 'pointer',
      ...Platform.select({
        web: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transitionProperty: 'box-shadow, transform',
          transitionDuration: '0.2s',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
      }),
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
      color: theme.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },
  });

  return (
    <ScrollView
      style={dynamicStyles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={dynamicStyles.contentWrapper}>
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
                    <Ionicons name={section.icon as any} size={18} color="#FFFFFF" />
                  </View>
                  <View style={dynamicStyles.cardContent}>
                    <Text style={dynamicStyles.cardTitle}>{section.title}</Text>
                    <Text style={dynamicStyles.cardSubtitle}>{section.subtitle}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

export default AnalyticsDesktopContent;
