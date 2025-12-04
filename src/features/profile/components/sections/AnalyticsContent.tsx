/**
 * Analytics Content
 * Обертка для экрана аналитики (скрывает header)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import AnalyticsHubScreen from '../../../admin/screens/AnalyticsHubScreen';

const AnalyticsContent: React.FC = () => {
  return (
    <View style={styles.wrapper}>
      <AnalyticsHubScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    // Скрываем SafeAreaView и header через отрицательный margin
    marginTop: -150,
    paddingTop: 150,
  },
});

export default AnalyticsContent;
