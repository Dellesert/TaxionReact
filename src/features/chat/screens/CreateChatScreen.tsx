/**
 * Create Chat Screen (Refactored)
 * Экран для создания нового чата
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { ChatType } from '../types/chat.types';
import { useTheme } from '@shared/hooks/useTheme';
import { User } from '@/types/user.types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Hooks
import { useCreateChatData } from '../hooks/useCreateChatData';
import { useCreateChatActions } from '../hooks/useCreateChatActions';
import { useUserSections } from '@shared/hooks/useUserSections';

// Components
import { CreateChatHeader } from '../components/headers/CreateChatHeader';
import { ChatNameInput } from '../components/common/ChatNameInput';
import { SelectedUsersCounter } from '../components/common/SelectedUsersCounter';
import { CreateChatSearchBar } from '../components/create-chat/CreateChatSearchBar';
import { CreateChatUserItem } from '../components/create-chat/CreateChatUserItem';

// Utils
import {
  canCreateChat,
  areAllUsersSelected,
  areSomeUsersSelected,
} from '../utils/createChatHelpers';
import { formatUserCount } from '../utils/createChatFormatters';

type CreateChatNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'CreateChat'>;

interface CreateChatScreenProps {
  route?: any;
  navigation?: any;
}

const CreateChatScreen: React.FC<CreateChatScreenProps> = ({ route: routeProp, navigation: navigationProp }) => {
  // Try hooks first (they might fail in modal context, that's ok)
  let navigationHook, routeHook;
  try {
    navigationHook = useNavigation<CreateChatNavigationProp>();
    routeHook = useRoute<RouteProp<ChatStackParamList, 'CreateChat'>>();
  } catch (e) {
    // Hooks failed - we're in modal context
  }

  const { theme } = useTheme();

  // Use props if provided (desktop modal), otherwise use hooks (mobile)
  const route = routeProp || routeHook;
  const navigation = navigationProp || navigationHook;

  const [chatType] = useState<ChatType>(route?.params?.initialChatType || 'group');
  const [chatName, setChatName] = useState('');
  const onChatCreated = route?.params?.onChatCreated;

  console.log('🎯 CreateChatScreen rendered with:', {
    hasRouteProp: !!routeProp,
    hasNavigationProp: !!navigationProp,
    routeParams: route?.params,
    initialChatType: route?.params?.initialChatType,
    hasOnChatCreated: !!onChatCreated,
    onChatCreatedType: typeof onChatCreated,
  });

  // Custom Hooks
  const { filteredUsers, isLoading, searchQuery, setSearchQuery } = useCreateChatData();

  const {
    selectedUsers,
    isCreating,
    toggleUserSelection,
    toggleDepartmentSelection,
    createChat,
  } = useCreateChatActions(chatType, onChatCreated);

  const { sections } = useUserSections(filteredUsers);

  // Memoize handlers to prevent recreating on every render
  const handleSearchChange = React.useCallback((text: string) => {
    setSearchQuery(text);
  }, [setSearchQuery]);

  const handleSearchClear = React.useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  // Handlers
  const handleCreateChat = async () => {
    await createChat(chatType, chatName);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const canCreate = canCreateChat(chatType as 'group' | 'private', chatName, selectedUsers);

  // Render section header
  const renderSectionHeader = React.useCallback(({ section }: { section: { title: string; data: User[] } }) => {
    if (chatType === 'group') {
      const departmentUserIds = section.data.map((u) => u.id);
      const allSelected = areAllUsersSelected(departmentUserIds, selectedUsers);
      const someSelected = areSomeUsersSelected(departmentUserIds, selectedUsers);

      return (
        <TouchableOpacity
          style={[
            styles.sectionHeaderContainer,
            { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border },
          ]}
          onPress={() => toggleDepartmentSelection(departmentUserIds)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View
              style={[
                styles.sectionCheckbox,
                { borderColor: theme.border },
                allSelected && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
                someSelected && {
                  backgroundColor: theme.primaryLight,
                  borderColor: theme.primary,
                },
              ]}
            >
              {allSelected && <Ionicons name="checkmark" size={14} color="white" />}
              {someSelected && <View style={styles.partialCheckmark} />}
            </View>
            <Text style={[styles.sectionHeaderText, { color: theme.text }]}>
              {section.title}
            </Text>
          </View>
          <Text style={[styles.sectionHeaderCount, { color: theme.textTertiary }]}>
            {formatUserCount(section.data.length)}
          </Text>
        </TouchableOpacity>
      );
    }

    // For private chat - regular header without checkbox
    return (
      <View
        style={[
          styles.sectionHeaderContainer,
          { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.sectionHeaderText, { color: theme.text }]}>
          {section.title}
        </Text>
        <Text style={[styles.sectionHeaderCount, { color: theme.textTertiary }]}>
          {formatUserCount(section.data.length)}
        </Text>
      </View>
    );
  }, [chatType, selectedUsers, theme, toggleDepartmentSelection]);

  // Key extractor
  const keyExtractor = React.useCallback((item: User) => item.id.toString(), []);

  // Render user item
  const renderUserItem = React.useCallback(({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.id);
    const isPrivateChat = chatType === 'private';

    return (
      <CreateChatUserItem
        user={item}
        isSelected={isSelected}
        isPrivateChat={isPrivateChat}
        onPress={toggleUserSelection}
      />
    );
  }, [selectedUsers, chatType, toggleUserSelection]);

  // Empty list component
  const renderEmptyList = React.useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={theme.border} />
      <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
        Пользователи не найдены
      </Text>
    </View>
  ), [theme]);

  // Loading component
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <CreateChatHeader
          onBack={handleBack}
          onCreateChat={handleCreateChat}
          canCreate={canCreate}
          isCreating={isCreating}
        />
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Загрузка пользователей...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <CreateChatHeader
        onBack={handleBack}
        onCreateChat={handleCreateChat}
        canCreate={canCreate}
        isCreating={isCreating}
      />

      {/* Chat Name Input - only for group chats */}
      {chatType === 'group' && (
        <ChatNameInput chatName={chatName} onChangeText={setChatName} />
      )}

      {/* Selected Users Count */}
      {chatType === 'group' && <SelectedUsersCounter count={selectedUsers.length} />}

      {/* Search */}
      <CreateChatSearchBar
        searchQuery={searchQuery}
        onChangeText={handleSearchChange}
        onClear={handleSearchClear}
      />

      {/* Users List */}
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderUserItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={true}
        ListEmptyComponent={renderEmptyList}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={21}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionHeaderCount: {
    fontSize: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partialCheckmark: {
    width: 10,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
});

export default CreateChatScreen;
