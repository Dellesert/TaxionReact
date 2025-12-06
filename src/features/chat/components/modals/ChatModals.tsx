import React from 'react';
import { ChatMembersModal } from './ChatMembersModal';
import { ForwardMessageModal } from './ForwardMessageModal';
import PollDetailModal from '@/features/polls/components/modals/PollDetailModal';
import type { Message } from '../../types/chat.types';

interface ChatModalsProps {
  chatId: number;
  currentUserId: number | undefined;
  creatorId: number | undefined;
  membersModalVisible: boolean;
  onCloseMembersModal: () => void;
  forwardingMessage: Message | null;
  onCloseForwardModal: () => void;
  onForwardToChat: (targetChatId: number) => Promise<void>;
  pollModalVisible: boolean;
  selectedPollId: number | null;
  onClosePollModal: () => void;
}

/**
 * Component that renders all modals for ChatScreen
 */
export const ChatModals: React.FC<ChatModalsProps> = ({
  chatId,
  currentUserId,
  creatorId,
  membersModalVisible,
  onCloseMembersModal,
  forwardingMessage,
  onCloseForwardModal,
  onForwardToChat,
  pollModalVisible,
  selectedPollId,
  onClosePollModal,
}) => {
  return (
    <>
      <ChatMembersModal
        visible={membersModalVisible}
        chatId={chatId}
        onClose={onCloseMembersModal}
        isCreator={currentUserId === creatorId}
        creatorId={creatorId}
      />

      <ForwardMessageModal
        visible={!!forwardingMessage}
        message={forwardingMessage}
        onClose={onCloseForwardModal}
        onForward={onForwardToChat}
      />

      {selectedPollId && (
        <PollDetailModal
          visible={pollModalVisible}
          pollId={selectedPollId}
          onClose={onClosePollModal}
        />
      )}
    </>
  );
};
