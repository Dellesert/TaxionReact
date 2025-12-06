import React from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';

interface LoginLogoProps {
  opacity: Animated.Value;
}

export const LoginLogo: React.FC<LoginLogoProps> = ({ opacity }) => {
  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View>
        <Image
          source={require('../../../../../assets/images/logo.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>Тахион</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  image: {
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
