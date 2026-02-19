/**
 * Performance Screen
 * Экран "Быстродействие" с настройкой уменьшения анимаций
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import AnimationSettingsContent from '../components/sections/AnimationSettingsContent';

const PerformanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? theme.background : '#F3F4F6',
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 0 : 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    headerRight: {
      width: 40,
    },
    scrollContent: {
      padding: 12,
      paddingBottom: Platform.OS === 'ios' ? 100 : 32,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Быстродействие</Text>
          <View style={dynamicStyles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
        <AnimationSettingsContent />
      </ScrollView>
    </View>
  );
};

export default PerformanceScreen;
