/**
 * QR Scanner Screen
 * Экран сканирования QR-кода для подтверждения входа на десктопе
 * Используется на мобильном устройстве (залогиненный пользователь)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@shared/hooks/useTheme';
import { confirmQRLogin } from '../api/qr-auth.api';

type ScanStatus = 'scanning' | 'confirming' | 'success' | 'error';

export default function QRScannerScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScanStatus>('scanning');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (status !== 'scanning') return;

    setStatus('confirming');

    try {
      await confirmQRLogin(data);
      setStatus('success');

      // Auto-close after 2 seconds
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 2000);
    } catch (err: any) {
      setStatus('error');

      if (err?.response?.status === 404) {
        setErrorMessage('QR-код истёк или недействителен');
      } else if (err?.response?.status === 409) {
        setErrorMessage('QR-код уже использован');
      } else if (err?.response?.status === 403) {
        setErrorMessage('Нет доступа');
      } else {
        setErrorMessage('Не удалось подтвердить вход');
      }
    }
  }, [status, navigation]);

  const handleRetry = useCallback(() => {
    setStatus('scanning');
    setErrorMessage('');
  }, []);

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Сканер QR</Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>

        <View style={styles.centeredContent}>
          <Ionicons name="camera-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            Нужен доступ к камере
          </Text>
          <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
            Для сканирования QR-кода необходим доступ к камере устройства
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.actionButtonText}>Разрешить доступ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Сканируйте QR-код</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      {status === 'scanning' && (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          {/* Overlay with scanning frame */}
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.hintText}>
                Наведите камеру на QR-код{'\n'}на экране компьютера
              </Text>
            </View>
          </View>
        </View>
      )}

      {status === 'confirming' && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.statusText}>Подтверждение входа...</Text>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.statusContainer}>
          <View style={[styles.statusIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          </View>
          <Text style={styles.statusTitle}>Вход подтверждён!</Text>
          <Text style={styles.statusSubtext}>Десктоп-устройство авторизовано</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.statusContainer}>
          <View style={[styles.statusIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
            <Ionicons name="alert-circle" size={64} color="#EF4444" />
          </View>
          <Text style={styles.statusTitle}>{errorMessage}</Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const SCAN_AREA_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    paddingTop: 32,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statusIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
