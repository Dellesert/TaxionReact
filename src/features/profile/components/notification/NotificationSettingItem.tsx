import React from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface NotificationSettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  value?: boolean;
  displayValue?: string;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  isLast?: boolean;
  showChevron?: boolean;
}

/**
 * Individual notification setting item with icon, title, and toggle/value
 */
export const NotificationSettingItem: React.FC<NotificationSettingItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  value,
  displayValue,
  onValueChange,
  onPress,
  isLoading = false,
  disabled = false,
  isLast = false,
  showChevron = false,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: theme.borderLight,
      opacity: disabled ? 0.5 : 1,
    },
    settingItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: iconColor,
    },
    settingContent: {
      flex: 1,
      marginLeft: 12,
    },
    settingTitle: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
    },
    settingDescription: {
      fontSize: 13,
      color: theme.textTertiary,
      marginTop: 2,
    },
    settingValue: {
      fontSize: 14,
      color: theme.textSecondary,
      marginRight: 8,
    },
  });

  const content = (
    <>
      <View style={dynamicStyles.settingItemLeft}>
        <View style={dynamicStyles.iconContainer}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </View>
        <View style={dynamicStyles.settingContent}>
          <Text style={dynamicStyles.settingTitle}>{title}</Text>
          <Text style={dynamicStyles.settingDescription}>{description}</Text>
        </View>
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : onValueChange && value !== undefined ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
          thumbColor={value ? theme.primary : '#F3F4F6'}
        />
      ) : displayValue ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={dynamicStyles.settingValue}>{displayValue}</Text>
          {showChevron && <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={dynamicStyles.settingItem} onPress={onPress} disabled={disabled}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={dynamicStyles.settingItem}>{content}</View>;
};
