/**
 * Create Chat Screen (Refactored)
 * Экран для создания нового чата
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { ChatType } from '../types/chat.types';
import { useTheme } from '@shared/hooks/useTheme';
import { User, UserGroupWithMembers } from '@/types/user.types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getUserGroups } from '@api/user-group.api';

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

  const { sections: departmentSections } = useUserSections(filteredUsers);

  // View mode toggle (departments / groups)
  type ViewMode = 'departments' | 'groups';
  const [viewMode, setViewMode] = useState<ViewMode>('departments');
  const [userGroups, setUserGroups] = useState<UserGroupWithMembers[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Load user groups on mount
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setIsLoadingGroups(true);
        const groups = await getUserGroups(true) as UserGroupWithMembers[];
        setUserGroups(groups);
      } catch (error) {
        console.error('Failed to load user groups:', error);
      } finally {
        setIsLoadingGroups(false);
      }
    };
    loadGroups();
  }, []);

  // Group sections
  const groupSections = useMemo(() => {
    if (!userGroups || userGroups.length === 0) {
      if (filteredUsers.length > 0) {
        return [{ title: 'Без группы', data: filteredUsers, departmentId: null as number | null }];
      }
      return [];
    }

    const searchLower = searchQuery.toLowerCase().trim();
    const userIdsInGroups = new Set<number>();
    const sections: Array<{ title: string; data: User[]; departmentId: number | null }> = [];

    userGroups.forEach((group) => {
      if (!group.members || group.members.length === 0) return;

      // Only keep members that exist in filteredUsers (respects search + exclusions)
      const filteredUserIds = new Set(filteredUsers.map(u => u.id));
      let members = group.members.filter((m) => filteredUserIds.has(m.id));

      if (searchLower) {
        members = members.filter((user) => {
          const name = user.name?.toLowerCase() || '';
          const email = user.email?.toLowerCase() || '';
          const position = user.position?.toLowerCase() || '';
          return name.includes(searchLower) || email.includes(searchLower) || position.includes(searchLower);
        });
      }

      if (members.length === 0) return;

      members.forEach((m) => userIdsInGroups.add(m.id));

      sections.push({
        title: group.name,
        data: members,
        departmentId: null,
      });
    });

    // Add ungrouped users
    const ungroupedUsers = filteredUsers.filter((u) => !userIdsInGroups.has(u.id));
    if (ungroupedUsers.length > 0) {
      sections.push({
        title: 'Без группы',
        data: ungroupedUsers,
        departmentId: null,
      });
    }

    return sections;
  }, [userGroups, filteredUsers, searchQuery]);

  // Select sections based on view mode
  const baseSections = viewMode === 'groups' ? groupSections : departmentSections;

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSectionCollapse = React.useCallback((sectionTitle: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionTitle)) {
        next.delete(sectionTitle);
      } else {
        next.add(sectionTitle);
      }
      return next;
    });
  }, []);

  // Sections with collapsed data filtered out
  const sections = React.useMemo(() =>
    baseSections.map(section => ({
      ...section,
      data: collapsedSections.has(section.title) ? [] : section.data,
    })),
    [baseSections, collapsedSections]
  );

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

  const canCreate = canCreateChat(chatType as 'group' | 'private' | 'channel', chatName, selectedUsers);

  // Render section header
  const renderSectionHeader = React.useCallback(({ section }: { section: { title: string; data: User[] } }) => {
    const isCollapsed = collapsedSections.has(section.title);
    // Get real user count from baseSections (since collapsed sections have empty data)
    const realSection = baseSections.find(s => s.title === section.title);
    const realData = realSection?.data || section.data;
    const userCount = realData.length;

    if (chatType === 'group' || chatType === 'channel') {
      const departmentUserIds = realData.map((u) => u.id);
      const allSelected = areAllUsersSelected(departmentUserIds, selectedUsers);
      const someSelected = areSomeUsersSelected(departmentUserIds, selectedUsers);

      return (
        <View
          style={[
            styles.sectionHeaderContainer,
            { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={styles.sectionHeaderLeft}
            onPress={() => toggleDepartmentSelection(departmentUserIds)}
            activeOpacity={0.7}
          >
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
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={() => toggleSectionCollapse(section.title)}
          >
            <Text style={[styles.sectionHeaderCount, { color: theme.textTertiary }]}>
              {formatUserCount(userCount)}
            </Text>
            <Ionicons
              name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      );
    }

    // For private chat - tap header to collapse/expand
    return (
      <TouchableOpacity
        style={[
          styles.sectionHeaderContainer,
          { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border },
        ]}
        onPress={() => toggleSectionCollapse(section.title)}
      >
        <View style={styles.sectionHeaderLeft}>
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
            size={18}
            color={theme.textSecondary}
          />
          <Text style={[styles.sectionHeaderText, { color: theme.text }]}>
            {section.title}
          </Text>
        </View>
        <Text style={[styles.sectionHeaderCount, { color: theme.textTertiary }]}>
          {formatUserCount(userCount)}
        </Text>
      </TouchableOpacity>
    );
  }, [chatType, selectedUsers, theme, toggleDepartmentSelection, collapsedSections, baseSections, toggleSectionCollapse]);

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

      {/* Chat Name Input - for group chats and channels */}
      {(chatType === 'group' || chatType === 'channel') && (
        <ChatNameInput chatName={chatName} onChangeText={setChatName} />
      )}

      {/* Selected Users Count */}
      {(chatType === 'group' || chatType === 'channel') && <SelectedUsersCounter count={selectedUsers.length} />}

      {/* Search */}
      <CreateChatSearchBar
        searchQuery={searchQuery}
        onChangeText={handleSearchChange}
        onClear={handleSearchClear}
      />

      {/* View Mode Toggle */}
      {userGroups.length > 0 && (
        <View style={[styles.segmentedControl, { backgroundColor: theme.backgroundSecondary }]}>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'departments' && [styles.segmentButtonActive, { backgroundColor: theme.background }]]}
            onPress={() => setViewMode('departments')}
          >
            <Text style={[styles.segmentButtonText, { color: theme.textSecondary }, viewMode === 'departments' && styles.segmentButtonTextActive && { color: theme.text, fontWeight: '600' }]}>
              По отделениям
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'groups' && [styles.segmentButtonActive, { backgroundColor: theme.background }]]}
            onPress={() => setViewMode('groups')}
          >
            <Text style={[styles.segmentButtonText, { color: theme.textSecondary }, viewMode === 'groups' && { color: theme.text, fontWeight: '600' }]}>
              По группам
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Users List */}
      {isLoadingGroups && viewMode === 'groups' ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
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
      )}
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
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  segmentButtonTextActive: {
    fontWeight: '600' as const,
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
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
