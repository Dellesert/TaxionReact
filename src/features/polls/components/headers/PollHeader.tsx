import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';

interface PollHeaderProps {
  hasActions: boolean;
  onOpenMenu: () => void;
  onClose: () => void;
}

export const PollHeader: React.FC<PollHeaderProps> = ({
  hasActions,
  onOpenMenu,
  onClose,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <ScreenHeader
        title="Опрос"
        customContent={
          <View style={styles.customHeader}>
            {/* Left button - Close */}
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerSideButton}
            >
              <Ionicons name="close" size={24} color={theme.error} />
            </TouchableOpacity>

            {/* Title */}
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Опрос</Text>
            </View>

            {/* Right button - Menu (3 dots) */}
            {hasActions && (
              <TouchableOpacity
                onPress={onOpenMenu}
                style={styles.headerSideButton}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={theme.primary} />
              </TouchableOpacity>
            )}
            {/* Spacer if no actions to balance the layout */}
            {!hasActions && <View style={styles.headerSideButton} />}
          </View>
        }
        showDivider={false}
        withShadow={false}
        containerStyle={{ paddingTop: 14, paddingBottom: 14 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerSideButton: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
