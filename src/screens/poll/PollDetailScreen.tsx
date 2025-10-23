import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import * as pollApi from '@api/poll.api';
import { Poll, PollOption, PollType } from '@/types/poll.types';

type PollStackParamList = {
  PollList: undefined;
  PollDetail: { pollId: number };
  EditPoll: { pollId: number };
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

  // Check if user is system administrator (only admin or super_admin, NOT manager)
  const isSystemAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Check if user can delete/close/publish poll (creator or system administrators ONLY)
  const canDeleteOrClosePoll = poll && (poll.created_by === currentUser?.id || isSystemAdmin);

  // Check if user can edit poll:
  // - Creator: only before publication (status === 'draft')
  // - System admin: always can edit
  const canEditPoll = poll && (
    (poll.created_by === currentUser?.id && poll.status === 'draft') || // Creator only in draft
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
      setError(error.message || 'Failed to load poll');
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
        </View>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPollDetail}>
          <Text style={styles.retryButtonText}>Попробовать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Опрос не найден</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{poll.title}</Text>
        <View style={styles.headerActions}>
          {canEditPoll && (
            <TouchableOpacity
              onPress={() => navigation.navigate('EditPoll', { pollId: poll.id })}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
          )}
          {canDeleteOrClosePoll && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {poll.description && (
        <View style={styles.descriptionContainer}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {poll.description}
          </Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            Создан {new Date(poll.created_at).toLocaleDateString('ru-RU')}
          </Text>
        </View>
        {poll.end_time && (
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              До {new Date(poll.end_time).toLocaleDateString('ru-RU')}
            </Text>
          </View>
        )}
        <View style={styles.infoItem}>
          <Ionicons name="people-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  descriptionContainer: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
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
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  revoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  revoteButtonText: {
    fontSize: 16,
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
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
});

export default PollDetailScreen;
