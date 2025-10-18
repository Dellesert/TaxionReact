/**
 * Connection Status Component
 * Индикатор статуса подключения WebSocket
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { websocketService } from '@services/websocket.service';

interface ConnectionStatusProps {
  compact?: boolean; // Компактный режим для отображения в header
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ compact = false }) => {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const checkStatus = () => {
      try {
        if (websocketService.isConnected()) {
          setStatus('connected');
        } else {
          setStatus('connecting'); // при желании тут можно детектить 'disconnected'
        }
      } catch {
        setStatus('disconnected');
      }
    };

    // сразу проверяем
    checkStatus();

    // периодическая проверка
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Плавное появление/исчезание
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(status === 'connected' ? 2000 : 0),
      Animated.timing(fadeAnim, { toValue: status === 'connected' ? 0 : 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [status, fadeAnim]);

  // В компактном режиме, когда подключено и баннер уже погас — ничего не показываем
  if (status === 'connected' && compact) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return { text: 'Подключено', color: '#2ecc71' }; // зелёный
      case 'connecting':
        return { text: 'Подключение...', color: '#434343ff' }; // желтовато-оранжевый
      case 'disconnected':
      default:
        return { text: 'Нет подключения', color: '#e74c3c' }; // красный
    }
  };

  const config = getStatusConfig();

  const Icon = () => {
    if (status === 'connecting') {
      // Спиннер: размер поменьше в компактном режиме
      return (
        <ActivityIndicator
          size={'small'}
          // цвет для web может игнорироваться браузером, но RNW прокидывает стиль
          color={config.color}
          style={styles.spinner}
        />
      );
    }
   
  };

  if (compact) {
    return (
      <Animated.View style={[styles.compactContainer, { opacity: fadeAnim }]}>
        <Icon />
        <Text style={styles.compactText}>{config.text}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
      <View style={styles.bannerRow}>
        <Icon />
        <Text style={styles.bannerText}>{config.text}</Text>
      </View>
    </Animated.View>
  );
};

const DOT_SIZE = 10;

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    color: '#2c2c2cff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  spinner: {
    marginRight: 4,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#3a3a3aff',
    borderRadius: 12,
  },
  compactText: {
    fontSize: 12,
    color: '#323232ff',
    fontWeight: '500',
    marginLeft: 6,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
