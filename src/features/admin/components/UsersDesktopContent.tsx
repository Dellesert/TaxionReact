/**
 * Users Desktop Content
 * Обертка для экрана управления пользователями (скрывает header для desktop)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import UsersScreen from '../screens/UsersScreen';

const UsersDesktopContent: React.FC = () => {
  return (
    <View style={styles.wrapper}>
      <UsersScreen />
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

export default UsersDesktopContent;
