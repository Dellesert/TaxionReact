import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export interface FormatMarker {
  open: string;
  close: string;
}

export type FormatButtonType = 'bold' | 'italic' | 'strikethrough' | 'code' | 'spoiler';

interface FormattingToolbarProps {
  onFormat: (marker: FormatMarker) => void;
  activeFormats?: Set<FormatButtonType>;
  onClose?: () => void;
}

const TOOLBAR_ITEMS: { icon?: string; label: string; marker: FormatMarker; formatType: FormatButtonType; textStyle?: object }[] = [
  { label: 'B', marker: { open: '*', close: '*' }, formatType: 'bold', textStyle: { fontWeight: 'bold' as const } },
  { label: 'I', marker: { open: '_', close: '_' }, formatType: 'italic', textStyle: { fontStyle: 'italic' as const } },
  { label: 'S', marker: { open: '~', close: '~' }, formatType: 'strikethrough', textStyle: { textDecorationLine: 'line-through' as const } },
  { icon: 'code-slash-outline', label: '', marker: { open: '`', close: '`' }, formatType: 'code' },
  { icon: 'eye-off-outline', label: '', marker: { open: '||', close: '||' }, formatType: 'spoiler' },
];

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ onFormat, activeFormats, onClose }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundTertiary, borderTopColor: theme.border }]}>
      {TOOLBAR_ITEMS.map((item, index) => {
        const isActive = activeFormats?.has(item.formatType) ?? false;
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.button,
              { backgroundColor: isActive ? theme.primary : theme.input },
            ]}
            onPress={() => onFormat(item.marker)}
            activeOpacity={0.7}
          >
            {item.icon ? (
              <Ionicons name={item.icon as any} size={18} color={isActive ? '#fff' : theme.text} />
            ) : (
              <Text style={[styles.buttonText, { color: isActive ? '#fff' : theme.text }, item.textStyle]}>
                {item.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
      {onClose && (
        <TouchableOpacity
          style={[styles.closeButton]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    borderTopWidth: 1,
  },
  button: {
    width: 36,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
  closeButton: {
    width: 36,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
});
