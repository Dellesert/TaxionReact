/**
 * Chat Settings Screen
 * Экран настроек чата (Refactored)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '@navigation/types';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import { ConfirmDialog } from '@shared/components/common/ConfirmDialog';
import { InputDialog } from '@shared/components/common/InputDialog';
import { ActionSheet, ActionSheetOption } from '@shared/components/common/ActionSheet';
import { ActionModal } from '@shared/components/common/ActionModal';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';
import { ChatDetailTabs, TabType } from '../components/common/ChatDetailTabs';
import { ParticipantsTab } from '../components/chat-details/ParticipantsTab';
import { AttachmentsTab } from '../components/attachments/AttachmentsTab';
import { ForwardMessageModal } from '../components/modals/ForwardMessageModal';
import { Message, Attachment } from '../types/chat.types';
import { sendMessage } from '../api/chat.api';

// Hooks
import { useChatSettingsData } from '../hooks/useChatSettingsData';
import { useChatMembers } from '../hooks/useChatMembers';
import { useChatSettingsActions } from '../hooks/useChatSettingsActions';
import { useChatAvatar } from '../hooks/useChatAvatar';

// Components
import { ChatSettingsHeader } from '../components/headers/ChatSettingsHeader';
import { PrivateChatInfo } from '../components/chat-details/PrivateChatInfo';
import { GroupChatInfo } from '../components/chat-details/GroupChatInfo';
import { QuickAction } from '../components/common/QuickActions';

// Utils
import {
  getCreatorId,
  isUserChatCreator,
  getMemberRole,
  canUserManageMembers,
} from '../utils/chatSettingsHelpers';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatSettings'>;

const ChatSettingsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, chatName } = route.params;
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);

  // Custom Hooks
  const { chat, otherUser, departmentName } = useChatSettingsData(chatId, currentUser?.id);
  const { members, isLoadingMembers, addMembers, removeMember, updateMemberRole } = useChatMembers(
    chatId,
    chat?.type
  );
  const { deleteChat, leaveChat, renameChat, clearHistory } = useChatSettingsActions(chatId);
  const { isUploadingAvatar, changeAvatar } = useChatAvatar(chatId);

  // Local State - Dialog visibility
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shouldClearHistory, setShouldClearHistory] = useState(false);

  // Members management state
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{ id: number; name: string } | null>(null);
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{
    userId: number;
    userName: string;
    currentRole: string;
    newRole: string;
  } | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    userId: number;
    userName: string;
    role: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('participants');

  // Forward image state
  const [forwardingAttachment, setForwardingAttachment] = useState<Attachment | null>(null);

  // Permissions
  const creatorId = getCreatorId(chat);
  const isCreator = isUserChatCreator(currentUser?.id, creatorId);
  const currentUserRole = getMemberRole(members, currentUser?.id);
  const isOwner = currentUserRole === 'owner';
  const canManageMembers = canUserManageMembers(currentUserRole);

  // Set initial tab based on chat type
  useEffect(() => {
    if (chat?.type === 'private') {
      setActiveTab('attachments');
    } else if (chat?.type === 'group') {
      setActiveTab('participants');
    }
  }, [chat?.type]);

  // Handlers
  const handleSearchMessages = () => {
    // Возвращаемся на экран чата и открываем поиск
    navigation.navigate('Chat', {
      chatId,
      chatName: chatName || undefined,
      openSearch: true,
    });
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      await addMembers(selectedUserIds);
      setShowAddMembersModal(false);
      setSelectedUserIds([]);
    } catch (error) {
      console.error('Failed to add members:', error);
    }
  };

  const handleRemoveMember = (userId: number, userName: string) => {
    setUserToRemove({ id: userId, name: userName });
    setShowRemoveDialog(true);
  };

  const confirmRemoveMember = async () => {
    if (!userToRemove) return;

    try {
      await removeMember(userToRemove.id);
      setShowRemoveDialog(false);
      setUserToRemove(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleToggleAdmin = (userId: number, userName: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    setRoleChangeData({ userId, userName, currentRole, newRole });
    setShowRoleChangeDialog(true);
  };

  const confirmRoleChange = async () => {
    if (!roleChangeData) return;

    try {
      await updateMemberRole(roleChangeData.userId, roleChangeData.newRole as 'admin' | 'member');
      setShowRoleChangeDialog(false);
      setRoleChangeData(null);
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleOpenActionMenu = (userId: number, userName: string, role: string) => {
    setSelectedMember({ userId, userName, role });
    setShowActionMenu(true);
  };

  const handleCloseActionMenu = () => {
    setShowActionMenu(false);
    setSelectedMember(null);
  };

  const handleMenuAction = (action: 'changeRole' | 'remove') => {
    if (!selectedMember) return;

    handleCloseActionMenu();

    if (action === 'changeRole') {
      handleToggleAdmin(selectedMember.userId, selectedMember.userName, selectedMember.role);
    } else if (action === 'remove') {
      handleRemoveMember(selectedMember.userId, selectedMember.userName);
    }
  };

  // Handler for delete button
  const handleDeletePress = () => {
    setShouldClearHistory(false); // Сбрасываем чекбокс
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    deleteChat(shouldClearHistory);
  };

  // Quick actions for private chat
  const privateQuickActions: QuickAction[] = useMemo(
    () => [
      {
        icon: 'search-outline',
        label: 'Поиск',
        onPress: handleSearchMessages,
      },
      {
        icon: 'trash-bin-outline',
        label: 'Очистить',
        onPress: () => setShowClearHistoryDialog(true),
      },
      {
        icon: 'trash-outline',
        label: 'Удалить',
        onPress: handleDeletePress,
        color: theme.error || '#FF3B30',
      },
    ],
    [theme.error, handleDeletePress]
  );

  // Quick actions for group chat
  const groupQuickActions: QuickAction[] = useMemo(() => {
    const actions: QuickAction[] = [];

    if (isCreator) {
      actions.push({
        icon: 'camera-outline',
        label: isUploadingAvatar ? 'Загрузка...' : 'Фото',
        onPress: changeAvatar,
        disabled: isUploadingAvatar,
      });
      actions.push({
        icon: 'create-outline',
        label: 'Название',
        onPress: () => setShowRenameDialog(true),
      });
    }

    actions.push({
      icon: 'search-outline',
      label: 'Поиск',
      onPress: handleSearchMessages,
    });

    if (!isCreator) {
      actions.push({
        icon: 'exit-outline',
        label: 'Покинуть',
        onPress: () => setShowLeaveDialog(true),
        color: theme.error || '#FF3B30',
      });
    } else {
      actions.push({
        icon: 'trash-outline',
        label: 'Удалить',
        onPress: handleDeletePress,
        color: theme.error || '#FF3B30',
      });
    }

    return actions;
  }, [isCreator, isUploadingAvatar, changeAvatar, theme.error, handleDeletePress]);

  // Handle forward image to chat
  const handleForwardToChat = async (targetChatId: number) => {
    if (!forwardingAttachment) return;

    try {
      await sendMessage(targetChatId, {
        content: '',
        file_ids: [forwardingAttachment.file_id],
      });
      setForwardingAttachment(null);
    } catch (error) {
      console.error('Failed to forward image:', error);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
    },
    divider: {
      backgroundColor: theme.border,
    },
  });

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={['top', 'left', 'right']}
    >
      <ChatSettingsHeader onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Private chat info */}
        {chat?.type === 'private' && otherUser && (
          <PrivateChatInfo
            user={otherUser}
            departmentName={departmentName}
            quickActions={privateQuickActions}
          />
        )}

        {/* Group chat info */}
        {chat?.type === 'group' && (
          <GroupChatInfo
            chatName={chatName || ''}
            chatAvatar={chat?.avatar}
            membersCount={members.length}
            quickActions={groupQuickActions}
          />
        )}

        {/* Divider */}
        <View style={[styles.divider, dynamicStyles.divider]} />

        {/* Tabs */}
        <ChatDetailTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showParticipants={chat?.type === 'group'}
        />

        {/* Tab Content */}
        {activeTab === 'participants' && chat?.type === 'group' && (
          <ParticipantsTab
            members={members}
            isLoading={isLoadingMembers}
            currentUserId={currentUser?.id}
            creatorId={creatorId}
            currentUserRole={
              currentUserRole as 'owner' | 'admin' | 'member' | undefined
            }
            onAddMembers={canManageMembers ? () => setShowAddMembersModal(true) : undefined}
            onMemberPress={handleOpenActionMenu}
          />
        )}

        {activeTab === 'attachments' && (
          <AttachmentsTab
            chatId={chatId}
            onForwardImage={setForwardingAttachment}
          />
        )}
      </ScrollView>

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <UserSelectorModal
          visible={showAddMembersModal}
          onClose={() => {
            setShowAddMembersModal(false);
            setSelectedUserIds([]);
          }}
          selectedUserIds={selectedUserIds}
          onSelectionChange={setSelectedUserIds}
          multiSelect={true}
          title="Добавить участников"
          excludeUserIds={members.map((m) => m.user_id)}
          onDone={handleAddMembers}
        />
      )}

      {/* Action Menu */}
      <ActionSheet
        visible={showActionMenu}
        title={selectedMember?.userName || ''}
        options={[
          {
            label:
              selectedMember?.role === 'admin'
                ? 'Снять права администратора'
                : 'Назначить администратором',
            onPress: () => {
              if (selectedMember) {
                handleMenuAction('changeRole');
              }
            },
          },
          {
            label: 'Удалить из чата',
            onPress: () => {
              if (selectedMember) {
                handleMenuAction('remove');
              }
            },
            destructive: true,
          },
        ]}
        onCancel={handleCloseActionMenu}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Удалить чат"
        message={`Вы уверены, что хотите удалить чат "${chatName}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={() => deleteChat(false)}
        onCancel={() => setShowDeleteDialog(false)}
        destructive
      />

      {/* Leave Dialog */}
      <ConfirmDialog
        visible={showLeaveDialog}
        title="Покинуть чат"
        message={`Вы уверены, что хотите покинуть чат "${chatName}"?`}
        confirmText="Покинуть"
        cancelText="Отмена"
        onConfirm={() => leaveChat()}
        onCancel={() => setShowLeaveDialog(false)}
        destructive
      />

      {/* Rename Dialog */}
      <InputDialog
        visible={showRenameDialog}
        title="Переименовать чат"
        placeholder="Введите новое название"
        initialValue={chatName || ''}
        confirmText="Сохранить"
        cancelText="Отмена"
        onConfirm={renameChat}
        onCancel={() => setShowRenameDialog(false)}
      />

      {/* Remove Member Dialog */}
      <ConfirmDialog
        visible={showRemoveDialog}
        title="Удалить участника"
        message={`Вы уверены, что хотите удалить ${userToRemove?.name} из чата?`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmRemoveMember}
        onCancel={() => {
          setShowRemoveDialog(false);
          setUserToRemove(null);
        }}
        destructive
      />

      {/* Role Change Dialog */}
      <ConfirmDialog
        visible={showRoleChangeDialog}
        title="Изменить роль"
        message={
          roleChangeData
            ? `Вы уверены, что хотите ${
                roleChangeData.newRole === 'admin' ? 'назначить' : 'снять'
              } ${roleChangeData.userName} ${
                roleChangeData.newRole === 'admin'
                  ? 'администратором'
                  : 'с должности администратора'
              }?`
            : ''
        }
        confirmText="Подтвердить"
        cancelText="Отмена"
        onConfirm={confirmRoleChange}
        onCancel={() => {
          setShowRoleChangeDialog(false);
          setRoleChangeData(null);
        }}
        destructive={false}
      />

      {/* Clear History Dialog */}
      <ConfirmDialog
        visible={showClearHistoryDialog}
        title="Очистить историю"
        message="Вы уверены, что хотите очистить всю историю сообщений? Это действие нельзя отменить."
        confirmText="Очистить"
        cancelText="Отмена"
        onConfirm={clearHistory}
        onCancel={() => setShowClearHistoryDialog(false)}
        destructive
      />

      {/* Delete Modal */}
      <ActionModal
        visible={showDeleteModal}
        title={chat?.type === 'private' ? 'Удалить чат' : 'Удалить чат для всех'}
        message={
          chat?.type === 'private'
            ? 'Вы уверены, что хотите удалить этот чат?'
            : 'Вы уверены, что хотите удалить чат для всех участников?'
        }
        checkbox={{
          label: 'Также удалить историю сообщений',
          checked: shouldClearHistory,
          onChange: setShouldClearHistory,
        }}
        actions={[
          {
            text: 'Отмена',
            style: 'cancel',
            onPress: () => setShowDeleteModal(false),
          },
          {
            text: 'Удалить',
            style: 'destructive',
            icon: 'trash-outline',
            onPress: handleConfirmDelete,
          },
        ]}
        onDismiss={() => setShowDeleteModal(false)}
      />

      {/* Forward Image Modal */}
      <ForwardMessageModal
        visible={!!forwardingAttachment}
        message={forwardingAttachment ? {
          id: 0,
          chat_id: chatId,
          sender_id: currentUser?.id || 0,
          content: '',
          message_type: 'text',
          created_at: new Date().toISOString(),
          attachments: [forwardingAttachment],
        } as Message : null}
        onClose={() => setForwardingAttachment(null)}
        onForward={handleForwardToChat}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  divider: {
    height: 1,
    marginVertical: 0,
  },
});

export default ChatSettingsScreen;
