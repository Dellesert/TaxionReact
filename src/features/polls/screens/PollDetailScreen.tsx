import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { usePollData } from '../hooks/usePollData';
import { usePollVoting } from '../hooks/usePollVoting';
import { usePollActions } from '../hooks/usePollActions';
import { usePollPermissions } from '../hooks/usePollPermissions';
import { PollDetailSkeleton } from '../components/states/PollDetailSkeleton';
import EditPollModal from '../components/modals/EditPollModal';
import { UserProfileModal } from '@shared/components/common/UserProfileModal';
import { PollHeader } from '../components/headers/PollHeader';
import { PollDesktopHeader } from '../components/headers/PollDesktopHeader';
import { PollActionMenu } from '../components/common/PollActionMenu';
import { PollInfo } from '../components/poll-details/PollInfo';
import { PollVotingUI } from '../components/voting/PollVotingUI';
import { PollResults } from '../components/results/PollResults';
import { PollActionButtons } from '../components/voting/PollActionButtons';
import { PollErrorState } from '../components/states/PollErrorState';
import { PollDesktopLayout } from '../components/poll-details/PollDesktopLayout';
import { getOrCreateDirectChat } from '@/features/chat/api/chat.api';
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
  const isDesktop = useIsWideScreen();
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
  } = usePollActions();

  const permissions = usePollPermissions(poll, currentUser?.id, currentUser?.role);

  // UI state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Derived state
  const isCreatorOrAdmin = poll
    ? poll.created_by === currentUser?.id || isUserSystemAdmin
    : false;

  // Check if user can revote (already voted, poll is active, not creator/admin, not already revoting)
  const canRevote = poll?.user_has_voted &&
                    !isRevoting &&
                    poll?.status === 'active' &&
                    !isCreatorOrAdmin;

  const hasActions = permissions.can_edit || permissions.can_delete_or_close || canRevote;

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
    if (isFromChat) {
      navigation.setOptions({
        headerTitle: () => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: theme.text }}>Опрос</Text>
          </View>
        ),
        headerRight: hasActions && poll ? () => (
          <TouchableOpacity
            onPress={() => setShowActionMenu(true)}
            style={{ padding: 4, marginRight: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.primary} />
          </TouchableOpacity>
        ) : undefined,
      });
    }
  }, [
    isFromChat,
    poll,
    navigation,
    permissions,
    isDeleting,
    theme.primary,
    theme.text,
    hasActions,
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

  // Show content skeleton only when loading and no poll data yet
  const showContentSkeleton = isLoading && !poll;

  // Fade animation for content
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showContentSkeleton && poll) {
      // Fade in content when loaded
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [showContentSkeleton, poll]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.card }]}
      edges={['top']}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header - always show to prevent jumping */}
        {!isFromChat && (
          isDesktop && poll ? (
            <PollDesktopHeader
              poll={poll}
              canEdit={permissions.can_edit}
              canDeleteOrClose={permissions.can_delete_or_close}
              isDeleting={isDeleting}
              isPublishing={isPublishing}
              onEdit={() => setShowEditModal(true)}
              onDelete={handleDeleteAction}
              onPublish={handlePublishAction}
              onClose={handleCloseAction}
              onBack={() => navigation.goBack()}
            />
          ) : !isDesktop && !showContentSkeleton ? (
            <PollHeader
              hasActions={hasActions}
              onOpenMenu={() => setShowActionMenu(true)}
              onClose={() => navigation.goBack()}
            />
          ) : null
        )}

        {/* Loading state - content skeleton */}
        {showContentSkeleton && <PollDetailSkeleton isFromChat={isFromChat} />}

        {/* Error state */}
        {!showContentSkeleton && error && (
          <PollErrorState
            error={error}
            onRetry={loadPollDetail}
            onGoBack={() => navigation.goBack()}
          />
        )}

        {/* Content - only show when loaded */}
        {!showContentSkeleton && !error && poll && (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            {/* Content - Desktop or Mobile Layout */}
            {isDesktop ? (
          <PollDesktopLayout
            poll={poll}
            votersPreview={votersPreview}
            canDeleteOrClose={permissions.can_delete_or_close}
            isCreatorOrAdmin={isCreatorOrAdmin}
            isRevoting={isRevoting}
            isVoting={isVoting}
            isPublishing={isPublishing}
            showResults={showResults}
            showVotingUI={showVotingUI}
            showResultsSection={showResultsSection}
            selectedOptions={selectedOptions}
            textAnswer={textAnswer}
            ratingValue={ratingValue}
            comment={comment}
            onUserPress={handleUserPress}
            onOptionToggle={(optionId) => handleOptionToggle(optionId, poll.type)}
            onTextChange={setTextAnswer}
            onRatingChange={setRatingValue}
            onSelectRatingOption={(optionId) => handleOptionToggle(optionId, 'single_choice')}
            onCommentChange={setComment}
            onVote={handleVoteAction}
            onRevote={() => setIsRevoting(true)}
            onCancelRevote={() => {
              setIsRevoting(false);
              loadPollDetail();
            }}
            onToggleResults={() => setShowResults(!showResults)}
            onPublish={handlePublishAction}
            onViewVoters={() => navigation.navigate('PollVoters', { pollId: poll.id })}
          />
        ) : (
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
                    isRevoting={isRevoting}
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
        )}
          </Animated.View>
        )}

        {/* Modals */}
        {poll && (
          <EditPollModal
            visible={showEditModal}
            pollId={poll.id}
            onClose={() => setShowEditModal(false)}
            onPollUpdated={loadPollDetail}
          />
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

        {poll && (
          <PollActionMenu
            visible={showActionMenu}
            poll={poll}
            canEdit={permissions.can_edit}
            canDeleteOrClose={permissions.can_delete_or_close}
            canRevote={canRevote}
            onClose={() => setShowActionMenu(false)}
            onEdit={() => {
              setShowActionMenu(false);
              setShowEditModal(true);
            }}
            onClosePoll={() => {
              setShowActionMenu(false);
              handleCloseAction();
            }}
            onDelete={() => {
              setShowActionMenu(false);
              handleDeleteAction();
            }}
            onRevote={() => {
              setShowActionMenu(false);
              setIsRevoting(true);
            }}
            isDesktop={isDesktop}
          />
        )}
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
