/**
 * QR Login Modal
 * Модальное окно с QR-кодом для входа на десктопе
 * Работает только на web/Electron платформе
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { generateQRToken, getQRTokenStatus } from '../../api/qr-auth.api';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { useAuthStore } from '@shared/store/authStore';
import * as accountManager from '@services/accountManager';

const POLL_INTERVAL = 2000; // 2 seconds
const QR_SIZE = 220;

interface QRLoginModalProps {
  visible: boolean;
  onClose: () => void;
}

export const QRLoginModal: React.FC<QRLoginModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'confirmed' | 'error' | 'expired'>('loading');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Generate QR code as data URL (web only)
  const generateQRDataUrl = useCallback(async (data: string) => {
    if (Platform.OS !== 'web') return;

    try {
      // Dynamic import of qrcode package (web only)
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(data, {
        width: QR_SIZE * 2,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });
      if (mountedRef.current) {
        setQrDataUrl(url);
      }
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  }, []);

  // Generate new QR token
  const generateToken = useCallback(async () => {
    try {
      setStatus('loading');
      setQrDataUrl(null);

      const response = await generateQRToken();
      if (!mountedRef.current) return;

      setToken(response.token);
      setExpiresAt(response.expires_at);
      setStatus('ready');

      await generateQRDataUrl(response.token);
    } catch (err) {
      console.error('Failed to generate QR token:', err);
      if (mountedRef.current) {
        setStatus('error');
      }
    }
  }, [generateQRDataUrl]);

  // Poll for status
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      if (!token || !mountedRef.current) return;

      // Check if token expired
      if (Date.now() / 1000 > expiresAt) {
        if (mountedRef.current) {
          setStatus('expired');
        }
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        return;
      }

      try {
        const response = await getQRTokenStatus(token);
        if (!mountedRef.current) return;

        if (response.status === 'confirmed' && response.session && response.user) {
          setStatus('confirmed');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }

          // Store session and user data
          await secureStorage.setItemAsync(
            STORAGE_KEYS.SESSION_ID,
            response.session.session_id
          );
          await secureStorage.setItemAsync(
            STORAGE_KEYS.USER_DATA,
            JSON.stringify(response.user)
          );

          // Update auth store
          const savedSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
          useAuthStore.setState({
            user: response.user,
            sessionId: savedSessionId,
            isAuthenticated: true,
            isLoading: false,
          });

          // Save to multi-account store
          if (response.user && savedSessionId) {
            await accountManager.saveAccountAfterLogin(response.user, savedSessionId);
            const { useAccountStore } = require('@shared/store/accountStore');
            await useAccountStore.getState().loadAccounts();
          }

          // Close modal after short delay
          setTimeout(() => {
            if (mountedRef.current) {
              onClose();
            }
          }, 1500);
        } else if (response.status === 'expired') {
          setStatus('expired');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      } catch (err: any) {
        // 404 means token expired
        if (err?.response?.status === 404) {
          if (mountedRef.current) {
            setStatus('expired');
          }
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      }
    }, POLL_INTERVAL);
  }, [token, expiresAt, onClose]);

  // Initialize
  useEffect(() => {
    mountedRef.current = true;

    if (visible) {
      generateToken();
    }

    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [visible, generateToken]);

  // Start polling when token is ready
  useEffect(() => {
    if (status === 'ready' && token) {
      startPolling();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [status, token, startPolling]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay]}>
      <View style={[styles.modal, { backgroundColor: theme.card }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {status === 'loading' && (
            <>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                Генерация QR-кода...
              </Text>
            </>
          )}

          {status === 'ready' && qrDataUrl && (
            <>
              <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
                {Platform.OS === 'web' && (
                  <img
                    src={qrDataUrl}
                    width={QR_SIZE}
                    height={QR_SIZE}
                    alt="QR Code"
                    style={{ display: 'block' }}
                  />
                )}
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Войти по QR-коду
              </Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                Откройте приложение на телефоне, перейдите{'\n'}
                в «Активные сессии» → «Подключить устройство»{'\n'}
                и отсканируйте этот QR-код
              </Text>
            </>
          )}

          {status === 'confirmed' && (
            <>
              <View style={[styles.successIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={64} color={theme.primary} />
              </View>
              <Text style={[styles.title, { color: theme.primary }]}>
                Вход выполнен!
              </Text>
            </>
          )}

          {status === 'expired' && (
            <>
              <View style={[styles.expiredIcon, { backgroundColor: theme.warning + '20' }]}>
                <Ionicons name="time-outline" size={64} color={theme.warning || '#F59E0B'} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                QR-код истёк
              </Text>
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: theme.primary }]}
                onPress={generateToken}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.refreshButtonText}>Обновить QR-код</Text>
              </TouchableOpacity>
            </>
          )}

          {status === 'error' && (
            <>
              <View style={[styles.expiredIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Ошибка
              </Text>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                Не удалось сгенерировать QR-код
              </Text>
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: theme.primary }]}
                onPress={generateToken}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.refreshButtonText}>Попробовать снова</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  modal: {
    borderRadius: 20,
    padding: 32,
    minWidth: 380,
    maxWidth: 420,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    alignItems: 'center',
  },
  qrContainer: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    marginTop: 16,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  expiredIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
