import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NotificationListScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Notification List Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  text: { fontSize: 18, color: '#1F2937' },
});

export default NotificationListScreen;
