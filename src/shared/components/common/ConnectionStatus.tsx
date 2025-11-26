/**
 * Connection Status Component
 * Индикатор статуса подключения WebSocket
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { websocketService } from '@services/websocket.service';
import { useTheme } from '@shared/hooks/useTheme';

interface ConnectionStatusProps {
  compact?: boolean; // Компактный режим для отображения в header
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ compact = false }) => {
  // Проверяем начальный статус сразу
  const initialConnected = websocketService.isConnected();
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    initialConnected ? 'connected' : 'connecting'
  );
  const [shouldShow, setShouldShow] = useState(!initialConnected); // Если уже подключено - не показываем
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { theme } = useTheme();

  useEffect(() => {
    const checkStatus = () => {
      try {
        const isConnected = websocketService.isConnected();
        if (isConnected) {
          if (status !== 'connected') {
            setStatus('connected');
          }
        } else {
          setStatus('connecting'); // при желании тут можно детектить 'disconnected'
          setShouldShow(true); // Показываем снова при потере связи
        }
      } catch {
        setStatus('disconnected');
        setShouldShow(true);
      }
    };

    // периодическая проверка
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== 'connected') {
      // Плавное появление для статусов connecting/disconnected
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      return;
    }

    // Когда подключено - сразу скрываем без задержки
    setShouldShow(false);
  }, [status, fadeAnim]);

  // В компактном режиме - показываем только если НЕ подключено И shouldShow = true
  if (compact) {
    if (status === 'connected' || !shouldShow) {
      return null;
    }
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return { text: 'Подключено', color: '#2ecc71' }; // зелёный
      case 'connecting':
        return { text: 'Подключение', color: '#434343ff' }; // желтовато-оранжевый
    }
  };

  const config = getStatusConfig();

  const dynamicStyles = StyleSheet.create({
  bannerText: {
    color: theme.text,
  },
  compactText: {
    color: theme.text,
  },
  spinner: {
    color: theme.text,
  },
 });

  const Icon = () => {
    if (status === 'connecting') {
      // Спиннер: размер поменьше в компактном режиме
      return (
        <ActivityIndicator
          size={'small'}
          // цвет для web может игнорироваться браузером, но RNW прокидывает стиль
          color={theme.text}
          style={styles.spinner}
        />
      );
    }
   
  };

  if (compact) {
    return (
      <Animated.View style={[styles.compactContainer, { opacity: fadeAnim }]}>
        <Icon />
        <Text style={[styles.compactText, dynamicStyles.compactText]}>{config.text}</Text>
      </Animated.View>
    );
  }
  

  return (
    <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
      <View style={styles.bannerRow}>
        <Icon />
        <Text style={[dynamicStyles.bannerText, styles.bannerText]}>{config.text}</Text>
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
    fontSize: 20,
    fontWeight: '600',
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
    borderRadius: 12,
  },
  compactText: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 6,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
