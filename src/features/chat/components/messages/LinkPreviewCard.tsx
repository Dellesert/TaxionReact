import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { LinkPreview } from '../../types/chat.types';

interface LinkPreviewCardProps {
  linkPreview: LinkPreview;
  isOwnMessage?: boolean;
}

const LinkPreviewCardComponent: React.FC<LinkPreviewCardProps> = ({ linkPreview, isOwnMessage }) => {
  const { theme, isDark } = useTheme();

  const handlePress = async () => {
    try {
      const canOpen = await Linking.canOpenURL(linkPreview.url);
      if (canOpen) {
        await Linking.openURL(linkPreview.url);
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть ссылку');
    }
  };

  const hostname = (() => {
    try {
      return new URL(linkPreview.url).hostname.replace(/^www\./, '');
    } catch {
      return linkPreview.site_name || linkPreview.url;
    }
  })();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          borderLeftColor: theme.primary,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {linkPreview.image ? (
        <Image
          source={{ uri: linkPreview.image }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.content}>
        <Text style={[styles.siteName, { color: theme.primary }]} numberOfLines={1}>
          {linkPreview.site_name || hostname}
        </Text>
        {linkPreview.title ? (
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {linkPreview.title}
          </Text>
        ) : null}
        {linkPreview.description ? (
          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3}>
            {linkPreview.description}
          </Text>
        ) : null}
        <View style={styles.urlRow}>
          <Ionicons name="link-outline" size={12} color={theme.textTertiary} />
          <Text style={[styles.url, { color: theme.textTertiary }]} numberOfLines={1}>
            {hostname}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: 10,
  },
  siteName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  url: {
    fontSize: 11,
    flex: 1,
  },
});

export const LinkPreviewCard = React.memo(LinkPreviewCardComponent);
