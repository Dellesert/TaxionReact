import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface PollHeaderProps {
  canShare: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const PollHeader: React.FC<PollHeaderProps> = ({
  canShare,
  canEdit,
  canDelete,
  isDeleting,
  onShare,
  onEdit,
  onDelete,
  onClose,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.headerSection,
        { backgroundColor: theme.card, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: theme.backgroundTertiary }]}
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color={theme.error} />
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          {canShare && (
            <TouchableOpacity style={styles.headerButton} onPress={onShare}>
              <Ionicons name="share-outline" size={24} color={theme.error} />
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity style={styles.headerButton} onPress={onEdit}>
              <Ionicons name="create-outline" size={24} color={theme.error} />
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
