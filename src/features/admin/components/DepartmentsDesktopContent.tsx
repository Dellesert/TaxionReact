/**
 * Departments Desktop Content
 * Обертка для экрана управления отделами (скрывает header для desktop)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import DepartmentsScreen from '../screens/DepartmentsScreen';

const DepartmentsDesktopContent: React.FC = () => {
  return (
    <View style={styles.wrapper}>
      <DepartmentsScreen />
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

export default DepartmentsDesktopContent;
