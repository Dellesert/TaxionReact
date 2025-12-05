/**
 * Create Chat User Item Component
 * Элемент списка пользователя для создания чата
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import Avatar from '@shared/components/common/Avatar';
import { User } from '@/types/user.types';
import { getRoleText } from '../../utils/createChatFormatters';

interface CreateChatUserItemProps {
  user: User;
  isSelected: boolean;
  isPrivateChat: boolean;
  onPress: (userId: number) => void;
}

export const CreateChatUserItem: React.FC<CreateChatUserItemProps> = React.memo(({
  user,
  isSelected,
  isPrivateChat,
  onPress,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = React.useMemo(() => StyleSheet.create({
    userItem: {
      backgroundColor: theme.card,
      borderBottomColor: theme.border,
    },
    userItemSelected: {
      backgroundColor: theme.backgroundSecondary,
    },
    userName: {
      color: theme.text,
    },
    userRole: {
      color: theme.textSecondary,
    },
    userPosition: {
      color: theme.textTertiary,
    },
    checkbox: {
      borderColor: theme.border,
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    radio: {
      borderColor: theme.border,
    },
    radioSelected: {
      borderColor: theme.primary,
    },
    radioDot: {
      backgroundColor: theme.primary,
    },
  }), [theme]);

  return (
    <TouchableOpacity
      style={[
        styles.userItem,
        dynamicStyles.userItem,
        isSelected && dynamicStyles.userItemSelected,
      ]}
      onPress={() => onPress(user.id)}
    >
      <View style={styles.userInfo}>
        <Avatar
          name={user.name}
          imageUrl={user.avatar}
          size={48}
          status={user.status}
          showStatus={true}
        />
        <View style={styles.userDetails}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, dynamicStyles.userName]}>
              {user.name}
            </Text>
            {user.role === 'department_head' && (
              <Ionicons
                name="shield-checkmark"
                size={16}
                color="#F59E0B"
                style={styles.icon}
              />
            )}
          </View>
          <Text style={[styles.userRole, dynamicStyles.userRole]}>
            {getRoleText(user.role)}
          </Text>
          {user.position && (
            <Text style={[styles.userPosition, dynamicStyles.userPosition]}>
              {user.position}
            </Text>
          )}
        </View>
      </View>

      {/* Radio for private chat, checkbox for group */}
      {isPrivateChat ? (
        <View
          style={[
            styles.radio,
            dynamicStyles.radio,
            isSelected && dynamicStyles.radioSelected,
          ]}
        >
          {isSelected && <View style={[styles.radioDot, dynamicStyles.radioDot]} />}
        </View>
      ) : (
        <View
          style={[
            styles.checkbox,
            dynamicStyles.checkbox,
            isSelected && dynamicStyles.checkboxSelected,
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginLeft: 4,
  },
  userRole: {
    fontSize: 14,
  },
  userPosition: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
