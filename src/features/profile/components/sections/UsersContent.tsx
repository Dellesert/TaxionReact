/**
 * Users Content
 * Обертка для экрана управления пользователями (скрывает header)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import UsersScreen from '../../../admin/screens/UsersScreen';

const UsersContent: React.FC = () => {
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

export default UsersContent;
