/**
 * SessionCard Component
 * Карточка активной сессии
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { getDeviceInfo, getDeviceIcon, isCurrentSession } from '../../utils/activeSessionsHelpers';
import { formatSessionDate, formatSessionTimeAgo } from '../../utils/activeSessionsFormatters';
import type { ActiveSession } from '../../../../types/user.types';

interface SessionCardProps {
  session: ActiveSession;
  currentSessionId: string | null;
  onDelete: (session: ActiveSession) => void;
  onRename: (session: ActiveSession, newName: string) => Promise<void>;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  currentSessionId,
  onDelete,
  onRename,
}) => {
  const { theme } = useTheme();
  const isCurrent = isCurrentSession(session.session_id, currentSessionId);
  const deviceInfo = getDeviceInfo(session.user_agent);
  const deviceIcon = getDeviceIcon(session.user_agent);

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const displayName = session.custom_name || deviceInfo;

  const startEditing = () => {
    setEditValue(session.custom_name || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditValue('');
  };

  const confirmEditing = async () => {
    const trimmed = editValue.trim();
    // If unchanged, just cancel
    if (trimmed === (session.custom_name || '')) {
      cancelEditing();
      return;
    }
    setSaving(true);
    try {
      await onRename(session, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.sessionCard,
        { backgroundColor: theme.card, borderColor: theme.border },
        isCurrent && { borderColor: theme.primary, borderWidth: 2 },
      ]}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name={deviceIcon as any} size={24} color={theme.primary} />
          </View>
          <View style={styles.sessionDetails}>
            <View style={styles.sessionTitleRow}>
              {editing ? (
                <View style={styles.editRow}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.editInput,
                      { color: theme.text, borderColor: theme.primary, backgroundColor: theme.background },
                    ]}
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder={deviceInfo}
                    placeholderTextColor={theme.textTertiary}
                    maxLength={100}
                    editable={!saving}
                    onSubmitEditing={confirmEditing}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.editAction, { backgroundColor: theme.primary }]}
                    onPress={confirmEditing}
                    disabled={saving}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editAction, { backgroundColor: theme.border }]}
                    onPress={cancelEditing}
                    disabled={saving}
                  >
                    <Ionicons name="close" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity onPress={startEditing} style={styles.nameRow}>
                    <Text style={[styles.deviceName, { color: theme.text }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Ionicons
                      name="pencil-outline"
                      size={14}
                      color={theme.textTertiary}
                      style={styles.editIcon}
                    />
                  </TouchableOpacity>
                  {isCurrent && (
                    <View style={[styles.currentBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.currentBadgeText}>Текущее</Text>
                    </View>
                  )}
                </>
              )}
            </View>
            {session.custom_name && !editing ? (
              <Text style={[styles.sessionMeta, { color: theme.textTertiary }]}>
                {deviceInfo}
              </Text>
            ) : null}
            <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
              IP: {session.ip_address}
            </Text>
            <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
              Активность: {formatSessionTimeAgo(session.last_active_at)}
            </Text>
            <Text style={[styles.sessionMeta, { color: theme.textTertiary }]}>
              Создана: {formatSessionDate(session.created_at)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(session)}>
          <Ionicons name="trash-outline" size={22} color={theme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  sessionInfo: {
    flexDirection: 'row',
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDetails: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 4,
  },
  editIcon: {
    marginTop: 1,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    flexShrink: 0,
  },
  sessionMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    flexShrink: 0,
  },
});
