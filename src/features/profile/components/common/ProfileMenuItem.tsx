import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface ProfileMenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  text: string;
  onPress?: () => void;
  value?: string;
  showChevron?: boolean;
  isLast?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Individual menu item with icon and optional chevron
 */
export const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
  icon,
  iconColor,
  text,
  onPress,
  value,
  showChevron = true,
  isLast = false,
  isLoading = false,
  disabled = false,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: theme.borderLight,
      backgroundColor: theme.backgroundSecondary,
      // @ts-ignore
      cursor: 'pointer',
    },
    menuItemText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 14,
      lineHeight: 20,
      color: theme.text,
    },
    menuItemValue: {
      fontSize: 14,
      color: theme.textTertiary,
      marginRight: 8,
    },
  });

  const staticStyles = StyleSheet.create({
    menuIcon: {
      color: '#FFFFFF',
      padding: 4,
      borderRadius: 6,
    },
  });

  return (
    <TouchableOpacity
      style={dynamicStyles.menuItem}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      <Ionicons
        style={[staticStyles.menuIcon, { backgroundColor: iconColor }]}
        name={icon}
        size={20}
        color="#FFFFFF"
      />
      <Text style={dynamicStyles.menuItemText}>{text}</Text>
      {value && <Text style={dynamicStyles.menuItemValue}>{value}</Text>}
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
      ) : (
        showChevron && <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
      )}
    </TouchableOpacity>
  );
};
