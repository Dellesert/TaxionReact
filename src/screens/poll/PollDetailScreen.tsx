import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import * as pollApi from '@api/poll.api';
import * as chatApi from '@api/chat.api';
import { Poll, PollOption, PollType } from '@/types/poll.types';
import { SendMessageDto } from '@/types/chat.types';
import SharePollModal from '@components/poll/SharePollModal';
import EditPollModal from '@components/poll/EditPollModal';
import { Avatar } from '@components/common/Avatar';

type PollStackParamList = {
  PollList: undefined;
  PollDetail: { pollId: number; fromChat?: boolean };
  EditPoll: { pollId: number };
  PollVoters: { pollId: number };
};

type PollDetailScreenRouteProp = RouteProp<PollStackParamList, 'PollDetail'>;
type PollDetailScreenNavigationProp = StackNavigationProp<PollStackParamList, 'PollDetail'>;

const PollDetailScreen: React.FC = () => {
  const navigation = useNavigation<PollDetailScreenNavigationProp>();
  const route = useRoute<PollDetailScreenRouteProp>();
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);

  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [votersPreview, setVotersPreview] = useState<any[]>([]);

  // Проверяем, открыт ли опрос из чата по параметру fromChat
  const isFromChat = route.params.fromChat === true;

  // Check if user is system administrator (only admin or super_admin, NOT manager)
  const isSystemAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Check if user can delete/close/publish poll (creator or system administrators ONLY)
  const canDeleteOrClosePoll = poll && (poll.created_by === currentUser?.id || isSystemAdmin);

  // Check if user can edit poll:
  // - Creator: always can edit (except closed/archived/cancelled)
  // - System admin: always can edit
  const canEditPoll = poll && (
    (poll.created_by === currentUser?.id && poll.status !== 'closed' && poll.status !== 'archived' && poll.status !== 'cancelled') || // Creator can edit unless closed
    isSystemAdmin // System admin always
  );

  // Voting state
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [rankingValues, setRankingValues] = useState<{ [optionId: number]: number }>({});
  const [comment, setComment] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isRevoting, setIsRevoting] = useState(false);

  useEffect(() => {
    loadPollDetail();
  }, [route.params.pollId]);

  // Устанавливаем заголовок навигации, когда опрос открыт из чата
  useLayoutEffect(() => {
    if (isFromChat && poll) {
      console.log('📋 Setting poll title in navigation header:', poll.title);
      navigation.setOptions({
        title: poll.title,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 8 }}>
            {/* Кнопка поделиться - видна всем для активных опросов */}
            {poll.status === 'active' && (
              <TouchableOpacity
                onPress={() => setShowShareModal(true)}
                style={{ padding: 4 }}
              >
                <Ionicons name="share-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            )}
            {canEditPoll && (
              <TouchableOpacity
                onPress={() => setShowEditModal(true)}
                style={{ padding: 4 }}
              >
                <Ionicons name="create-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            )}
            {canDeleteOrClosePoll && (
              <TouchableOpacity
                onPress={handleDelete}
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
  }, [isFromChat, poll, navigation, canEditPoll, canDeleteOrClosePoll, isDeleting, theme.primary]);

  const loadPollDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedPoll = await pollApi.getPoll(route.params.pollId);
      console.log('📋 Poll loaded from getPoll:', {
        id: loadedPoll.id,
        total_votes: loadedPoll.total_votes,
        total_voters: loadedPoll.total_voters,
      });

      // Load poll results separately
      try {
        const results = await pollApi.getPollResults(route.params.pollId);
        console.log('📊 Poll results loaded:', JSON.stringify(results, null, 2));

        // Merge results into poll options
        if (results.options && loadedPoll.options) {
          loadedPoll.options = loadedPoll.options.map(option => {
            const resultOption = results.options.find(r => r.id === option.id || r.option_id === option.id);
            if (resultOption) {
              return {
                ...option,
                vote_count: resultOption.vote_count || 0,
                vote_percent: resultOption.vote_percent || 0,
              };
            }
            return option;
          });
        }

        // Update total votes count only
        // Note: We keep total_voters from getPoll() as it's correct there
        if (results.total_votes !== undefined) {
          loadedPoll.total_votes = results.total_votes;
        }
      } catch (resultsError) {
        console.warn('Failed to load poll results:', resultsError);
      }

      console.log('📊 Final poll data:', {
        total_votes: loadedPoll.total_votes,
        total_voters: loadedPoll.total_voters,
        options: loadedPoll.options?.map(opt => ({
          id: opt.id,
          text: opt.text,
          vote_count: opt.vote_count,
          vote_percent: opt.vote_percent,
        })),
      });

      setPoll(loadedPoll);

      // Load voters preview (first 5)
      // Show for creator/admin OR if show_results is enabled
      const isCreatorOrAdmin = loadedPoll.created_by === currentUser?.id || isSystemAdmin;
      if (loadedPoll.total_voters > 0 && (isCreatorOrAdmin || loadedPoll.show_results)) {
        try {
          const votersData = await pollApi.getPollVoters(route.params.pollId);
          setVotersPreview(votersData.voters.slice(0, 5));
        } catch (error) {
          console.warn('Failed to load voters preview:', error);
        }
      }

      // Reset revoting mode when reloading
      setIsRevoting(false);

      // If user already voted, show their vote
      if (loadedPoll.user_vote) {
        if (loadedPoll.user_vote.option_id) {
          setSelectedOptions([loadedPoll.user_vote.option_id]);
        }
        if (loadedPoll.user_vote.text_value) {
          setTextAnswer(loadedPoll.user_vote.text_value);
        }
        if (loadedPoll.user_vote.rating_value) {
          setRatingValue(loadedPoll.user_vote.rating_value);
        }
        if (loadedPoll.user_vote.comment) {
          setComment(loadedPoll.user_vote.comment);
        }
      }
    } catch (error: any) {
      console.error('Failed to load poll detail:', error);

      // Специальная обработка для ошибки 404 - опрос удалён
      if (error.status === 404 || (error.code === 'ERR_BAD_RESPONSE' && error.message.includes('404'))) {
        setError('Этот опрос был удалён и больше недоступен.');
      }
      // Специальная обработка для ошибки 403 - нет доступа к опросу
      else if (error.status === 403 || (error.code === 'ERR_BAD_RESPONSE' && error.message.includes('403'))) {
        setError('Этот опрос приватный и недоступен для вас. Вы не включены в список участников.');
      } else {
        setError(error.message || 'Не удалось загрузить опрос');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionToggle = (optionId: number) => {
    // Allow toggling only if user hasn't voted OR is in revoting mode
    if (poll?.user_has_voted && !isRevoting) return;

    if (poll?.type === 'single_choice') {
      setSelectedOptions([optionId]);
    } else if (poll?.type === 'multiple_choice') {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(selectedOptions.filter((id) => id !== optionId));
      } else {
        setSelectedOptions([...selectedOptions, optionId]);
      }
    }
  };

  const handlePublish = async () => {
    if (!poll) return;

    try {
      setIsPublishing(true);
      await pollApi.updatePollStatus(poll.id, { status: 'active' });

      if (Platform.OS === 'web') {
        alert('Опрос опубликован!');
      } else {
        Alert.alert('Успешно', 'Опрос опубликован!');
      }

      // Reload poll to get updated status
      await loadPollDetail();
    } catch (error: any) {
      console.error('Failed to publish poll:', error);
      const errorMsg = error.message || 'Не удалось опубликовать опрос';
      if (Platform.OS === 'web') {
        alert('Ошибка: ' + errorMsg);
      } else {
        Alert.alert('Ошибка', errorMsg);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = async () => {
    if (!poll) return;

    const confirmClose = async () => {
      try {
        setIsPublishing(true); // Reuse publishing state for closing too
        console.log('🔒 Closing poll:', poll.id);
        await pollApi.updatePollStatus(poll.id, { status: 'closed' });

        if (Platform.OS === 'web') {
          alert('Опрос завершен!');
        } else {
          Alert.alert('Успешно', 'Опрос завершен!');
        }

        // Reload poll to get updated status
        await loadPollDetail();
      } catch (error: any) {
        console.error('Failed to close poll:', error);
        const errorMsg = error.message || 'Не удалось завершить опрос';
        if (Platform.OS === 'web') {
          alert('Ошибка: ' + errorMsg);
        } else {
          Alert.alert('Ошибка', errorMsg);
        }
      } finally {
        setIsPublishing(false);
      }
    };

    // For web, use window.confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Вы уверены, что хотите завершить этот опрос? После завершения голосование будет невозможно.');
      if (confirmed) {
        await confirmClose();
      }
    } else {
      // For native, use Alert
      Alert.alert(
        'Завершить опрос?',
        'Вы уверены, что хотите завершить этот опрос? После завершения голосование будет невозможно.',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Завершить',
            style: 'destructive',
            onPress: confirmClose,
          },
        ]
      );
    }
  };

  const handleDelete = async () => {
    if (!poll) return;

    console.log('🗑️ Attempting to delete poll:', poll.id);
    console.log('👤 Current user:', currentUser?.id, 'Role:', currentUser?.role);
    console.log('📝 Poll creator:', poll.created_by);
    console.log('✅ Can delete:', canDeleteOrClosePoll);

    const confirmDelete = async () => {
      console.log('🔴 DELETE BUTTON PRESSED!!!');
      try {
        setIsDeleting(true);
        console.log('🗑️ Calling deletePoll API for poll ID:', poll.id);
        const result = await pollApi.deletePoll(poll.id);
        console.log('✅ Poll deleted successfully, result:', result);

        if (Platform.OS === 'web') {
          alert('Опрос удален!');
        } else {
          Alert.alert('Успешно', 'Опрос удален!');
        }

        navigation.goBack();
      } catch (error: any) {
        console.error('❌ Failed to delete poll:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);

        const errorMsg = error.details?.error || error.message || 'Не удалось удалить опрос';
        if (Platform.OS === 'web') {
          alert('Ошибка: ' + errorMsg);
        } else {
          Alert.alert('Ошибка', errorMsg);
        }
      } finally {
        setIsDeleting(false);
      }
    };

    // For web, use window.confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Вы уверены, что хотите удалить этот опрос? Это действие нельзя отменить.');
      if (confirmed) {
        await confirmDelete();
      }
    } else {
      // For native, use Alert
      Alert.alert(
        'Удалить опрос?',
        'Вы уверены, что хотите удалить этот опрос? Это действие нельзя отменить.',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: confirmDelete,
          },
        ]
      );
    }
  };

  const handleSharePoll = async (chatId: number) => {
    if (!poll) return;

    try {
      console.log('📤 Sharing poll to chat:', chatId);
      console.log('📊 Poll ID:', poll.id, 'Title:', poll.title);

      // Формируем данные опроса для отправки
      const pollData: any = {
        poll_id: poll.id,
        poll_title: poll.title,
        poll_question: poll.question || poll.description,
        poll_type: poll.type,
        poll_status: poll.status, // Используем статус из опроса
        total_votes: poll.total_votes || 0,
        ends_at: poll.end_time, // Всегда отправляем дату, статус укажет, завершен ли опрос
      };

      // Отправляем сообщение с типом 'poll' и передаем poll_data напрямую
      // Backend expects 'type' field, not 'message_type'
      const messageData: any = {
        content: poll.title,
        type: 'poll', // Backend expects 'type', not 'message_type'
        poll_id: poll.id,
        poll_data: pollData, // Передаем данные опроса явно
      };
      console.log('📦 Message data being sent:', JSON.stringify(messageData, null, 2));

      const sentMessage = await chatApi.sendMessage(chatId, messageData);

      console.log('✅ Poll shared to chat:', chatId);
      console.log('📨 Sent message:', {
        id: sentMessage.id,
        message_type: sentMessage.message_type,
        has_poll_data: !!(sentMessage as any).poll_data
      });
    } catch (error) {
      console.error('❌ Failed to share poll:', error);
      throw error;
    }
  };

  const handleVote = async () => {
    if (!poll) return;

    let voteData: any = {};

    try {
      setIsVoting(true);
      setError(null);

      switch (poll.type) {
        case 'single_choice':
          if (selectedOptions.length === 0) {
            Alert.alert('Ошибка', 'Выберите вариант ответа');
            setIsVoting(false);
            return;
          }
          voteData.option_ids = selectedOptions; // Backend expects array
          break;

        case 'multiple_choice':
          if (selectedOptions.length === 0) {
            Alert.alert('Ошибка', 'Выберите хотя бы один вариант');
            setIsVoting(false);
            return;
          }
          voteData.option_ids = selectedOptions; // Backend expects array
          break;

        case 'open_text':
          if (!textAnswer.trim()) {
            Alert.alert('Ошибка', 'Введите текстовый ответ');
            setIsVoting(false);
            return;
          }
          voteData.text_value = textAnswer;
          break;

        case 'rating':
          if (ratingValue === null) {
            Alert.alert('Ошибка', 'Выберите оценку');
            setIsVoting(false);
            return;
          }
          // Backend expects rating_values map: option_id -> rating
          voteData.rating_values = {};
          if (selectedOptions.length > 0) {
            voteData.rating_values[selectedOptions[0]] = ratingValue;
          } else if (poll.options.length > 0) {
            // If no specific option selected, rate the first option
            voteData.rating_values[poll.options[0].id] = ratingValue;
          }
          break;

        case 'ranking':
          if (Object.keys(rankingValues).length === 0) {
            Alert.alert('Ошибка', 'Проставьте ранжирование');
            setIsVoting(false);
            return;
          }
          // Backend expects ranking_values map: option_id -> rank
          voteData.ranking_values = rankingValues;
          break;
      }

      if (comment.trim()) {
        voteData.comment = comment;
      }

      console.log('📤 Voting with data:', JSON.stringify(voteData, null, 2));
      await pollApi.vote(poll.id, voteData);
      console.log('✅ Vote successful');

      // Save revoting state before reset
      const wasRevoting = isRevoting;

      // Reset revoting mode
      setIsRevoting(false);

      // Reload poll to get updated results
      await loadPollDetail();

      Alert.alert('Успешно', wasRevoting ? 'Ваш голос изменен!' : 'Ваш голос учтен!');
    } catch (error: any) {
      console.error('❌ Failed to vote:', error);
      console.error('📋 Vote data sent:', JSON.stringify(voteData, null, 2));
      console.error('📋 Error details:', JSON.stringify(error.details, null, 2));
      setError(error.message || 'Failed to submit vote');
      Alert.alert('Ошибка', error.details?.error || error.message || 'Не удалось проголосовать');
    } finally {
      setIsVoting(false);
    }
  };

  const renderVotingUI = () => {
    if (!poll) return null;

    // For admins and creators, always show results instead of voting UI
    const isCreatorOrAdmin = poll.created_by === currentUser?.id || isSystemAdmin;
    if (isCreatorOrAdmin && !isRevoting) {
      return null; // Results will be shown by renderResults()
    }

    // For closed/cancelled polls, only show message (no options)
    if (poll.status === 'closed' || poll.status === 'archived' || poll.status === 'cancelled') {
      return (
        <View style={styles.closedContainer}>
          <Ionicons name="lock-closed" size={48} color="#6B7280" />
          <Text style={styles.closedText}>Опрос завершен</Text>
        </View>
      );
    }

    // For regular users viewing results (toggle button pressed)
    if (showResults && !poll.user_has_voted && !isRevoting) {
      return null; // Results will be shown by renderResults() instead of options
    }

    // Show voting disabled message for voted users (unless they're revoting)
    if (poll.user_has_voted && poll.status === 'active' && !isRevoting) {
      return (
        <View style={styles.votedContainer}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          <Text style={styles.votedText}>Вы уже проголосовали</Text>
        </View>
      );
    }

    switch (poll.type) {
      case 'single_choice':
      case 'multiple_choice':
        return (
          <View style={styles.optionsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Выберите вариант:</Text>
            {poll.options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  { backgroundColor: theme.backgroundSecondary },
                  selectedOptions.includes(option.id) && [
                    styles.optionSelected,
                    { backgroundColor: theme.primary + '15' },
                  ],
                ]}
                onPress={() => handleOptionToggle(option.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Ionicons
                    name={
                      poll.type === 'single_choice'
                        ? selectedOptions.includes(option.id)
                          ? 'radio-button-on'
                          : 'radio-button-off'
                        : selectedOptions.includes(option.id)
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={24}
                    color={selectedOptions.includes(option.id) ? theme.primary : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.text },
                      selectedOptions.includes(option.id) && styles.optionTextSelected,
                    ]}
                  >
                    {option.text}
                  </Text>
                </View>
                {option.description && (
                  <Text style={styles.optionDescription}>{option.description}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'open_text':
        return (
          <View style={styles.textInputContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ваш ответ:</Text>
            <TextInput
              style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Введите ваш ответ..."
              placeholderTextColor="#9CA3AF"
              value={textAnswer}
              onChangeText={setTextAnswer}
              multiline
              numberOfLines={4}
            />
          </View>
        );

      case 'rating':
        return (
          <View style={styles.ratingContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ваша оценка:</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                  <Ionicons
                    name={ratingValue && ratingValue >= star ? 'star' : 'star-outline'}
                    size={40}
                    color={ratingValue && ratingValue >= star ? '#F59E0B' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {poll.options.length > 0 && (
              <View style={styles.ratingOptionsContainer}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Что оцениваем:</Text>
                {poll.options.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionButton,
                      selectedOptions.includes(option.id) && styles.optionSelected,
                    ]}
                    onPress={() => setSelectedOptions([option.id])}
                  >
                    <Text style={[styles.optionText, { color: theme.text }]}>{option.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );

      default:
        return (
          <Text style={styles.errorText}>Тип опроса не поддерживается</Text>
        );
    }
  };

  const renderResults = () => {
    if (!poll) return null;

    const isCreatorOrAdmin = poll.created_by === currentUser?.id || isSystemAdmin;

    // Always show results for creator/admin (even with 0 votes)
    if (isCreatorOrAdmin && !isRevoting) {
      return (
        <View style={[styles.resultsContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Результаты:</Text>
          {poll.options.map((option) => (
            <View key={option.id} style={styles.resultItem}>
              <Text style={[styles.resultText, { color: theme.text }]}>{option.text}</Text>
              <View style={[styles.resultBar, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.resultBarFill,
                    { width: `${option.vote_percent || 0}%`, backgroundColor: theme.primary },
                  ]}
                />
              </View>
              <Text style={styles.resultPercent}>{option.vote_percent?.toFixed(1) || 0}%</Text>
              <Text style={styles.resultCount}>({option.vote_count || 0} голосов)</Text>
            </View>
          ))}
          <View style={styles.totalVotes}>
            <Text style={styles.totalVotesText}>
              Всего голосов: {poll.total_votes || 0}
            </Text>
            <TouchableOpacity
              style={[styles.viewVotersButton, { borderColor: theme.primary }]}
              onPress={() => navigation.navigate('PollVoters', { pollId: poll.id })}
            >
              <Ionicons name="people-outline" size={18} color={theme.primary} />
              <Text style={[styles.viewVotersButtonText, { color: theme.primary }]}>
                Кто проголосовал
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // For regular users, check if results are allowed to be shown
    if (!poll.show_results) return null;

    // Check if results should be hidden based on vote status and settings
    if (!poll.user_has_voted && poll.show_results_after) return null;

    // Show results if user voted OR if they pressed the toggle button
    if (poll.user_has_voted || showResults) {
      return (
        <View style={[styles.resultsContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Результаты:</Text>
          {poll.options.map((option) => (
            <View key={option.id} style={styles.resultItem}>
              <Text style={[styles.resultText, { color: theme.text }]}>{option.text}</Text>
              <View style={[styles.resultBar, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.resultBarFill,
                    { width: `${option.vote_percent || 0}%`, backgroundColor: theme.primary },
                  ]}
                />
              </View>
              <Text style={styles.resultPercent}>{option.vote_percent?.toFixed(1) || 0}%</Text>
              <Text style={styles.resultCount}>({option.vote_count || 0} голосов)</Text>
            </View>
          ))}
          <View style={styles.totalVotes}>
            <Text style={styles.totalVotesText}>
              Всего голосов: {poll.total_votes || 0}
            </Text>
          </View>

          {/* Voters Preview */}
          {((poll.created_by === currentUser?.id || isSystemAdmin) || poll.show_results) && votersPreview.length > 0 && (
            <View style={[styles.votersPreviewSection, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.votersPreviewTitle, { color: theme.text }]}>
                Проголосовали ({poll.total_voters}):
              </Text>
              <View style={styles.votersPreviewList}>
                {votersPreview.map((voter) => (
                  <View key={voter.user_id} style={styles.voterPreviewItem}>
                    <Avatar name={voter.user_name} imageUrl={voter.avatar} size={32} />
                    <Text style={[styles.voterPreviewName, { color: theme.text }]} numberOfLines={1}>
                      {voter.user_name}
                    </Text>
                  </View>
                ))}
              </View>
              {poll.total_voters > 5 && (
                <TouchableOpacity
                  style={[styles.viewAllVotersButton, { borderColor: theme.primary }]}
                  onPress={() => navigation.navigate('PollVoters', { pollId: poll.id })}
                >
                  <Text style={[styles.viewAllVotersText, { color: theme.primary }]}>
                    Показать всех ({poll.total_voters})
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    const isPrivateError = error.includes('приватный') || error.includes('недоступен');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons
            name={isPrivateError ? "lock-closed" : "alert-circle"}
            size={64}
            color={isPrivateError ? "#F59E0B" : "#EF4444"}
          />
          <Text style={[styles.errorText, isPrivateError && { color: '#F59E0B' }]}>{error}</Text>
          {!isPrivateError && (
            <TouchableOpacity style={styles.retryButton} onPress={loadPollDetail}>
              <Text style={styles.retryButtonText}>Попробовать снова</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.backgroundSecondary, marginTop: 12 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.retryButtonText, { color: theme.text }]}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!poll) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Опрос не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Status config
  const statusConfig = {
    active: { label: 'Активен', color: '#10B981' },
    closed: { label: 'Завершен', color: '#6B7280' },
    draft: { label: 'Черновик', color: '#F59E0B' },
    cancelled: { label: 'Отменен', color: '#EF4444' },
  }[poll.status] || { label: poll.status, color: '#9CA3AF' };

  // Type config
  const typeConfig = {
    single_choice: { label: 'Один выбор', icon: 'radio-button-on', color: '#3B82F6' },
    multiple_choice: { label: 'Множественный', icon: 'checkbox', color: '#8B5CF6' },
    rating: { label: 'Оценка', icon: 'star', color: '#F59E0B' },
    ranking: { label: 'Ранжирование', icon: 'list', color: '#10B981' },
    open_text: { label: 'Текст', icon: 'text', color: '#EC4899' },
  }[poll.type] || { label: poll.type, icon: 'help-circle', color: '#9CA3AF' };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Показываем header только если опрос открыт не из чата (т.е. из списка опросов) */}
      {!isFromChat && (
        <View style={[styles.headerSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          {/* Header Row with Back and Action buttons */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: theme.backgroundTertiary }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color={theme.error} />
            </TouchableOpacity>
            <View style={styles.headerButtons}>
              {/* Кнопка поделиться - видна всем для активных опросов */}
              {poll.status === 'active' && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setShowShareModal(true)}
                >
                  <Ionicons name="share-outline" size={24} color={theme.error} />
                </TouchableOpacity>
              )}
              {canEditPoll && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setShowEditModal(true)}
                >
                  <Ionicons name="create-outline" size={24} color={theme.error} />
                </TouchableOpacity>
              )}
              {canDeleteOrClosePoll && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleDelete}
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
          </View>

          {/* Poll Title */}
          <Text style={[styles.pollTitle, { color: theme.text }]}>
            {poll.title}
          </Text>

          {/* Status and Type Row */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: statusConfig.color }]}>
              <Text style={styles.badgeText}>{statusConfig.label}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: typeConfig.color }]}>
              <Ionicons name={typeConfig.icon as any} size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>{typeConfig.label}</Text>
            </View>
          </View>

          {/* Info Row: Creator and Deadline */}
          <View style={styles.infoRow}>
            <View style={styles.creatorInfo}>
              <Avatar
                name={poll.creator?.name || 'Unknown'}
                imageUrl={poll.creator?.avatar}
                size={20}
              />
              <Text style={[styles.creatorText, { color: theme.textSecondary }]} numberOfLines={1}>
                {poll.creator?.name || 'Unknown'}
              </Text>
            </View>
            {poll.end_time && poll.status === 'active' && (
              <View style={styles.deadlineInfo}>
                <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.deadlineText, { color: theme.textSecondary }]}>
                  до {new Date(poll.end_time).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Card with Content */}
      <View style={[styles.card, { backgroundColor: theme.background }]}>
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Description Section */}
            {poll.description && (
              <View style={styles.descriptionSection}>
                <Text style={[styles.descriptionLabel, { color: theme.text }]}>Описание</Text>
                <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
                  {poll.description}
                </Text>
              </View>
            )}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.statText}>
                  Создан {new Date(poll.created_at).toLocaleDateString('ru-RU')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={16} color="#6B7280" />
                <Text style={styles.statText}>
                  Проголосовало: {poll.total_voters || 0}
                </Text>
              </View>
            </View>

            {renderVotingUI()}

            {/* Draft warning and publish button */}
      {poll.status === 'draft' && (
        <>
          <View style={styles.draftWarning}>
            <Ionicons name="information-circle" size={24} color="#F59E0B" />
            <Text style={styles.draftWarningText}>
              Это черновик. Опрос еще не опубликован и недоступен для голосования другим пользователям.
            </Text>
          </View>
          {canDeleteOrClosePoll && (
            <TouchableOpacity
              style={[styles.publishButton, { backgroundColor: '#10B981' }]}
              onPress={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="rocket" size={20} color="#FFFFFF" />
                  <Text style={styles.publishButtonText}>Опубликовать опрос</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Close poll button for active polls */}
      {poll.status === 'active' && canDeleteOrClosePoll && (
        <TouchableOpacity
          style={[styles.publishButton, { backgroundColor: '#F59E0B', marginTop: 0 }]}
          onPress={handleClose}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              <Text style={styles.publishButtonText}>Завершить опрос</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {poll.require_comment && (!poll.user_has_voted || isRevoting) && poll.status === 'active' && (
        <View style={styles.commentContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Комментарий:</Text>
          <TextInput
            style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
            placeholder="Добавьте комментарий..."
            placeholderTextColor="#9CA3AF"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* Vote/Revote button - hide for admins/creators and when viewing results */}
      {((!poll.user_has_voted || isRevoting) && poll.status === 'active' &&
        !(poll.created_by === currentUser?.id || isSystemAdmin) &&
        !showResults) && (
        <>
          <TouchableOpacity
            style={[styles.voteButton, { backgroundColor: theme.primary }]}
            onPress={handleVote}
            disabled={isVoting}
          >
            {isVoting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.voteButtonText}>
                {isRevoting ? 'Изменить голос' : 'Проголосовать'}
              </Text>
            )}
          </TouchableOpacity>
          {isRevoting && (
            <TouchableOpacity
              style={[styles.cancelRevoteButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              onPress={() => {
                setIsRevoting(false);
                // Restore original vote
                loadPollDetail();
              }}
            >
              <Text style={[styles.cancelRevoteButtonText, { color: theme.textSecondary }]}>
                Отмена
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Revote button for users who already voted (not for admins/creators) */}
      {poll.user_has_voted && !isRevoting && poll.status === 'active' && !(poll.created_by === currentUser?.id || isSystemAdmin) && (
        <TouchableOpacity
          style={[styles.revoteButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }]}
          onPress={() => setIsRevoting(true)}
        >
          <Ionicons name="refresh" size={20} color={theme.primary} />
          <Text style={[styles.revoteButtonText, { color: theme.primary }]}>
            Переголосовать
          </Text>
        </TouchableOpacity>
      )}

      {/* Toggle button to show/hide results for polls that allow viewing before voting (not for admins/creators) */}
      {poll.show_results && !poll.show_results_after && !poll.user_has_voted && !(poll.created_by === currentUser?.id || isSystemAdmin) && (
        <TouchableOpacity
          style={[styles.toggleResultsButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
          onPress={() => setShowResults(!showResults)}
        >
          <Ionicons
            name={showResults ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.primary}
          />
          <Text style={[styles.toggleResultsText, { color: theme.text }]}>
            {showResults ? 'Скрыть результаты' : 'Посмотреть результаты'}
          </Text>
        </TouchableOpacity>
      )}

            {renderResults()}
          </View>
        </ScrollView>
      </View>

      {/* Share Poll Modal */}
      {poll && (
        <SharePollModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          poll={poll}
          onShare={handleSharePoll}
        />
      )}

      {/* Edit Poll Modal */}
      {poll && (
        <EditPollModal
          visible={showEditModal}
          pollId={poll.id}
          onClose={() => setShowEditModal(false)}
          onPollUpdated={loadPollDetail}
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
  scrollContent: {
    paddingBottom: 120,
  },
  // Header section
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Poll title in header
  pollTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 12,
  },
  // Badges row
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Info row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  creatorText: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Card with rounded corners
  card: {
    flex: 1,
    overflow: 'hidden',
  },
  // Tab content
  tabContent: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Description section
  descriptionSection: {
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    padding: 16,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#3B82F6',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    marginLeft: 36,
  },
  textInputContainer: {
    padding: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    padding: 16,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  ratingOptionsContainer: {
    marginTop: 16,
  },
  commentContainer: {
    padding: 16,
    paddingTop: 0,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    marginTop: 24,
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  revoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    marginTop: 24,
  },
  revoteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelRevoteButton: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelRevoteButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  toggleResultsText: {
    fontSize: 15,
    fontWeight: '500',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  votedContainer: {
    padding: 32,
    alignItems: 'center',
  },
  votedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 12,
  },
  draftWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 12,
  },
  draftWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  closedContainer: {
    padding: 32,
    alignItems: 'center',
  },
  closedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  resultsContainer: {
    padding: 16,
    marginTop: 16,
  },
  resultItem: {
    marginBottom: 16,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  resultBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  resultBarFill: {
    height: '100%',
  },
  resultPercent: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  totalVotes: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalVotesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  viewVotersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  viewVotersButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  votersPreviewSection: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  votersPreviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  votersPreviewList: {
    gap: 12,
  },
  voterPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voterPreviewName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  viewAllVotersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  viewAllVotersText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PollDetailScreen;
