/**
 * Dashboard Header
 * Заголовок экрана сводки (только SafeArea)
 */

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@shared/hooks/useTheme';

export const DashboardHeader: React.FC = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }} />
  );
};

export default DashboardHeader;
