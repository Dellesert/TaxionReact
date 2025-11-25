import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { useNotification } from '@contexts/NotificationContext';
import { useActionModal } from '@contexts/ActionModalContext';
import { usePollData } from '../hooks/usePollData';
import { usePollVoting } from '../hooks/usePollVoting';
import { usePollActions } from '../hooks/usePollActions';
import { usePollPermissions } from '../hooks/usePollPermissions';
import { PollDetailSkeleton } from '../components/PollDetailSkeleton';
import SharePollModal from '../components/SharePollModal';
import EditPollModal from '../components/EditPollModal';
import { UserProfileModal } from '@components/common/UserProfileModal';
import { PollHeader } from '@screens/poll/components/PollHeader';
import { PollInfo } from '@screens/poll/components/PollInfo';
import { PollVotingUI } from '@screens/poll/components/PollVotingUI';
import { PollResults } from '@screens/poll/components/PollResults';
import { PollActionButtons } from '@screens/poll/components/PollActionButtons';
import { PollErrorState } from '@screens/poll/components/PollErrorState';
import { getOrCreateDirectChat } from '@api/chat.api';
import { isSystemAdmin, shouldShowResults, shouldShowVotingUI } from '../utils/pollHelpers';

type PollStackParamList = {
  PollList: undefined;
  PollDetail: { pollId: number; fromChat?: boolean };
  EditPoll: { pollId: number };
  PollVoters: { pollId: number };
};

type PollDetailScreenRouteProp = RouteProp<PollStackParamList, 'PollDetail'>;
type PollDetailScreenNavigationProp = NativeStackNavigationProp<
  PollStackParamList,
  'PollDetail'
>;

const PollDetailScreen: React.FC = () => {
  const navigation = useNavigation<PollDetailScreenNavigationProp>();
  const route = useRoute<PollDetailScreenRouteProp>();
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const { showSuccess, showError } = useNotification();
  const { showConfirm } = useActionModal();

  // Check if opened from chat
  const isFromChat = route.params.fromChat === true;
  const isUserSystemAdmin = isSystemAdmin(currentUser?.role);

  // Custom hooks
  const { poll, isLoading, error, votersPreview, loadPollDetail } = usePollData(
    route.params.pollId,
    currentUser?.id,
    isUserSystemAdmin
  );

  const {
    selectedOptions,
    textAnswer,
    ratingValue,
    comment,
    showResults,
    isRevoting,
    isVoting,
    setTextAnswer,
    setRatingValue,
    setComment,
    setShowResults,
    setIsRevoting,
    handleOptionToggle,
    handleVote,
    initializeVoteFromPoll,
  } = usePollVoting();

  const {
    isPublishing,
    isDeleting,
    handlePublish,
    handleClose,
    handleDelete,
    handleSharePoll,
  } = usePollActions();

  const permissions = usePollPermissions(poll, currentUser?.id, currentUser?.role);

  // UI state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Derived state
  const isCreatorOrAdmin = poll
    ? poll.created_by === currentUser?.id || isUserSystemAdmin
    : false;

  const showVotingUI = shouldShowVotingUI(
    poll,
    currentUser?.id,
    currentUser?.role,
    showResults,
    isRevoting
  );

  const showResultsSection = shouldShowResults(
    poll,
    currentUser?.id,
    currentUser?.role,
    showResults,
    isRevoting
  );

  // Load poll data on mount
  useEffect(() => {
    loadPollDetail();
  }, [route.params.pollId]);

  // Initialize voting state when poll loads
  useEffect(() => {
    if (poll) {
      initializeVoteFromPoll(poll);
    }
  }, [poll?.id]);

  // Setup header for chat mode
  useLayoutEffect(() => {
    if (isFromChat && poll) {
      navigation.setOptions({
        title: poll.title,
        headerRight: () => (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 8 }}
          >
            {permissions.can_share && (
              <TouchableOpacity
                onPress={() => setShowShareModal(true)}
                style={{ padding: 4 }}
              >
                <Ionicons name="share-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            )}
            {permissions.can_edit && (
              <TouchableOpacity
                onPress={() => setShowEditModal(true)}
                style={{ padding: 4 }}
              >
                <Ionicons name="create-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            )}
            {permissions.can_delete_or_close && (
              <TouchableOpacity
                onPress={() => poll && handleDeleteAction()}
                style={{ padding: 4 }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Ionicons name="trash-outline" size={24} color="#EF4444" />
                )}
              </TouchableOpacity>
            )}
          </View>
        ),
      });
    }
  }, [
    isFromChat,
    poll,
    navigation,
    permissions,
    isDeleting,
    theme.primary,
  ]);

  // Handlers
  const handleUserPress = (userId: number) => {
    setSelectedUserId(userId);
    setShowProfileModal(true);
  };

  const handleVoteAction = async () => {
    if (!poll) return;

    await handleVote(
      poll,
      async (wasRevoting) => {
        await loadPollDetail();
        showSuccess(wasRevoting ? 'Ваш голос изменён' : 'Ваш голос учтён');
      },
      (message) => showError(message)
    );
  };

  const handlePublishAction = async () => {
    if (!poll) return;
    await handlePublish(
      poll,
      async () => {
        showSuccess('Опрос опубликован');
        await loadPollDetail();
      },
      (message) => showError(message)
    );
  };

  const handleCloseAction = () => {
    if (!poll) return;
    handleClose(
      poll,
      async () => {
        showSuccess('Опрос завершён');
        await loadPollDetail();
      },
      (message) => showError(message),
      showConfirm
    );
  };

  const handleDeleteAction = () => {
    if (!poll) return;
    handleDelete(
      poll,
      () => {
        showSuccess('Опрос удалён');
        navigation.goBack();
      },
      (message) => showError(message),
      showConfirm
    );
  };

  const handleShare = async (chatId: number) => {
    if (!poll) return;
    try {
      await handleSharePoll(poll, chatId);
    } catch (error) {
      showError('Не удалось отправить опрос');
    }
  };

  const handleOpenChat = async (userId: number) => {
    try {
      const chat = await getOrCreateDirectChat(userId);
      setShowProfileModal(false);
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        // @ts-ignore
        rootNavigation.navigate('Chats', {
          screen: 'Chat',
          params: { chatId: chat.id },
        });
      }
    } catch (error: any) {
      showError(error.message || 'Не удалось открыть чат');
    }
  };

  // Loading state
  if (isLoading) {
    return <PollDetailSkeleton isFromChat={isFromChat} />;
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <PollErrorState
          error={error}
          onRetry={loadPollDetail}
          onGoBack={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  // No poll loaded
  if (!poll) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.card }]}
      edges={['top']}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header - only show if not opened from chat */}
        {!isFromChat && (
          <PollHeader
            canShare={permissions.can_share}
            canEdit={permissions.can_edit}
            canDelete={permissions.can_delete_or_close}
            isDeleting={isDeleting}
            onShare={() => setShowShareModal(true)}
            onEdit={() => setShowEditModal(true)}
            onDelete={handleDeleteAction}
            onClose={() => navigation.goBack()}
          />
        )}

        {/* Content Card */}
        <View style={[styles.card, { backgroundColor: theme.background }]}>
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Poll Info */}
              <PollInfo poll={poll} onUserPress={handleUserPress} />

              {/* Voting UI */}
              {showVotingUI && (
                <PollVotingUI
                  poll={poll}
                  selectedOptions={selectedOptions}
                  textAnswer={textAnswer}
                  ratingValue={ratingValue}
                  onOptionToggle={(optionId) =>
                    handleOptionToggle(optionId, poll.type)
                  }
                  onTextChange={setTextAnswer}
                  onRatingChange={setRatingValue}
                  onSelectRatingOption={(optionId) => {
                    handleOptionToggle(optionId, 'single_choice');
                  }}
                />
              )}

              {/* Action Buttons */}
              <PollActionButtons
                poll={poll}
                canDeleteOrClose={permissions.can_delete_or_close}
                isCreatorOrAdmin={isCreatorOrAdmin}
                isRevoting={isRevoting}
                isVoting={isVoting}
                isPublishing={isPublishing}
                showResults={showResults}
                comment={comment}
                onCommentChange={setComment}
                onVote={handleVoteAction}
                onRevote={() => setIsRevoting(true)}
                onCancelRevote={() => {
                  setIsRevoting(false);
                  loadPollDetail();
                }}
                onToggleResults={() => setShowResults(!showResults)}
                onPublish={handlePublishAction}
                onClose={handleCloseAction}
              />

              {/* Results */}
              {showResultsSection && (
                <PollResults
                  poll={poll}
                  votersPreview={votersPreview}
                  isCreatorOrAdmin={isCreatorOrAdmin}
                  onViewVoters={() =>
                    navigation.navigate('PollVoters', { pollId: poll.id })
                  }
                />
              )}
            </View>
          </ScrollView>
        </View>

        {/* Modals */}
        {poll && (
          <>
            <SharePollModal
              visible={showShareModal}
              onClose={() => setShowShareModal(false)}
              poll={poll}
              onShare={handleShare}
            />

            <EditPollModal
              visible={showEditModal}
              pollId={poll.id}
              onClose={() => setShowEditModal(false)}
              onPollUpdated={loadPollDetail}
            />
          </>
        )}

        <UserProfileModal
          visible={showProfileModal}
          userId={selectedUserId}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedUserId(null);
          }}
          onOpenChat={handleOpenChat}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  card: {
    flex: 1,
    overflow: 'hidden',
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default PollDetailScreen;
