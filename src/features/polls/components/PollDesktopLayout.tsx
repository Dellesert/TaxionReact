/**
 * Poll Desktop Layout
 * Компонент для отображения деталей опроса на широких экранах
 * Layout: Три колонки - Информация + Голосование/Результаты + Проголосовавшие
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import type { Poll, PollVoter } from '../types/poll.types';
import { PollInfo } from './PollInfo';
import { PollVotingUI } from './PollVotingUI';
import { PollActionButtons } from './PollActionButtons';

interface PollDesktopLayoutProps {
  poll: Poll;
  votersPreview: PollVoter[];
  canDeleteOrClose: boolean;
  isCreatorOrAdmin: boolean;
  isRevoting: boolean;
  isVoting: boolean;
  isPublishing: boolean;
  showResults: boolean;
  showVotingUI: boolean;
  showResultsSection: boolean;
  selectedOptions: number[];
  textAnswer: string;
  ratingValue: number | null;
  comment: string;

  // Callbacks
  onUserPress: (userId: number) => void;
  onOptionToggle: (optionId: number) => void;
  onTextChange: (text: string) => void;
  onRatingChange: (value: number) => void;
  onSelectRatingOption: (optionId: number) => void;
  onCommentChange: (text: string) => void;
  onVote: () => void;
  onRevote: () => void;
  onCancelRevote: () => void;
  onToggleResults: () => void;
  onPublish: () => void;
  onClose: () => void;
  onViewVoters: () => void;
}

export const PollDesktopLayout: React.FC<PollDesktopLayoutProps> = ({
  poll,
  votersPreview,
  canDeleteOrClose,
  isCreatorOrAdmin,
  isRevoting,
  isVoting,
  isPublishing,
  showResults,
  showVotingUI,
  showResultsSection,
  selectedOptions,
  textAnswer,
  ratingValue,
  comment,
  onUserPress,
  onOptionToggle,
  onTextChange,
  onRatingChange,
  onSelectRatingOption,
  onCommentChange,
  onVote,
  onRevote,
  onCancelRevote,
  onToggleResults,
  onPublish,
  onClose,
  onViewVoters,
}) => {
  const { theme } = useTheme();
  const [hoveredSection, setHoveredSection] = useState<'info' | 'voting' | 'voters' | null>(null);

  const showVotersColumn = showResultsSection && (isCreatorOrAdmin || poll.show_results) && poll.total_voters > 0;

  return (
    <View style={styles.container}>
      {/* Two Column Layout */}
      <View style={styles.mainContent}>
        {/* Left Column - Main Content */}
        <View style={styles.leftColumn}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Poll Header Section */}
            <View style={[styles.pollHeaderSection, { backgroundColor: theme.card }]}>
              <Text style={[styles.pollTitle, { color: theme.text }]}>{poll.title}</Text>
              <View style={styles.badgesRow}>
                <View style={[styles.statusBadge, {
                  backgroundColor: poll.status === 'active' ? '#10B981' :
                                   poll.status === 'draft' ? '#6B7280' :
                                   poll.status === 'closed' ? '#EF4444' : '#6B7280'
                }]}>
                  <Text style={styles.badgeText}>
                    {poll.status === 'active' ? 'Активен' :
                     poll.status === 'draft' ? 'Черновик' :
                     poll.status === 'closed' ? 'Завершён' : poll.status}
                  </Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: theme.primary }]}>
                  <Ionicons
                    name={poll.type === 'single_choice' ? 'radio-button-on' :
                          poll.type === 'multiple_choice' ? 'checkbox' :
                          poll.type === 'rating' ? 'star' : 'create'}
                    size={12}
                    color="#FFFFFF"
                  />
                  <Text style={styles.badgeText}>
                    {poll.type === 'single_choice' ? 'Один вариант' :
                     poll.type === 'multiple_choice' ? 'Несколько вариантов' :
                     poll.type === 'rating' ? 'Рейтинг' :
                     poll.type === 'open_text' ? 'Текст' : poll.type}
                  </Text>
                </View>

                {/* Visibility Badge */}
                <View style={[styles.visibilityBadge, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons
                    name={poll.visibility === 'public' ? 'globe-outline' :
                          poll.visibility === 'invite_only' ? 'mail-outline' :
                          poll.visibility === 'department' ? 'people-outline' : 'lock-closed-outline'}
                    size={12}
                    color="#FFFFFF"
                  />
                  <Text style={styles.badgeText}>
                    {poll.visibility === 'public' ? 'Публичный' :
                     poll.visibility === 'invite_only' ? 'По приглашению' :
                     poll.visibility === 'department' ? 'Отдел' : 'Приватный'}
                  </Text>
                </View>

                {/* Anonymous Badge */}
                {poll.allow_anonymous && (
                  <View style={[styles.anonymousBadge, { backgroundColor: '#8B5CF6' }]}>
                    <Ionicons name="eye-off-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.badgeText}>Анонимный</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Voting/Results Section */}
            {((showVotingUI || isRevoting) || (showResultsSection && !isRevoting && !showVotingUI && poll.options && poll.options.length > 0 && poll.options.some(opt => opt.vote_count !== undefined))) && (
              <View style={[styles.mainCard, { backgroundColor: theme.card }]}>
                {(showVotingUI || isRevoting) && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="create-outline" size={22} color={theme.primary} />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        {isRevoting ? 'Изменить голос' : 'Ваш голос'}
                      </Text>
                    </View>
                    <PollVotingUI
                      poll={poll}
                      selectedOptions={selectedOptions}
                      textAnswer={textAnswer}
                      ratingValue={ratingValue}
                      isRevoting={isRevoting}
                      onOptionToggle={onOptionToggle}
                      onTextChange={onTextChange}
                      onRatingChange={onRatingChange}
                      onSelectRatingOption={onSelectRatingOption}
                    />
                  </>
                )}

                {/* Results */}
                {showResultsSection && !isRevoting && !showVotingUI && poll.options && poll.options.length > 0 && poll.options.some(opt => opt.vote_count !== undefined) && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="bar-chart" size={22} color={theme.primary} />
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Результаты</Text>
                    </View>
                    <View style={styles.resultsSection}>
                      {poll.options.map((option) => (
                        <View key={option.id} style={styles.resultItem}>
                          <View style={styles.resultHeader}>
                            <Text style={[styles.resultText, { color: theme.text }]}>{option.text}</Text>
                            <Text style={[styles.resultPercent, { color: theme.primary }]}>
                              {option.vote_percent?.toFixed(1) || 0}%
                            </Text>
                          </View>
                          <View style={[styles.resultBar, { backgroundColor: theme.border }]}>
                            <View
                              style={[
                                styles.resultBarFill,
                                {
                                  width: `${option.vote_percent || 0}%`,
                                  backgroundColor: theme.primary,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
                            {option.vote_count || 0} {option.vote_count === 1 ? 'голос' : 'голосов'}
                          </Text>
                        </View>
                      ))}
                      <View style={[styles.totalVotes, { borderTopColor: theme.border }]}>
                        <Ionicons name="people" size={18} color={theme.textSecondary} />
                        <Text style={[styles.totalVotesText, { color: theme.textSecondary }]}>
                          Всего проголосовало: {poll.total_voters || 0}
                        </Text>
                      </View>

                      {/* Revote button under results */}
                      {poll.user_has_voted && poll.status === 'active' && !isCreatorOrAdmin && (
                        <TouchableOpacity
                          style={[styles.revoteButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }]}
                          onPress={onRevote}
                        >
                          <Ionicons name="refresh" size={20} color={theme.primary} />
                          <Text style={[styles.revoteButtonText, { color: theme.primary }]}>
                            Переголосовать
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <PollActionButtons
                    poll={poll}
                    canDeleteOrClose={canDeleteOrClose}
                    isCreatorOrAdmin={isCreatorOrAdmin}
                    isRevoting={isRevoting}
                    isVoting={isVoting}
                    isPublishing={isPublishing}
                    showResults={showResults}
                    comment={comment}
                    isDesktop={true}
                    onCommentChange={onCommentChange}
                    onVote={onVote}
                    onRevote={onRevote}
                    onCancelRevote={onCancelRevote}
                    onToggleResults={onToggleResults}
                    onPublish={onPublish}
                    onClose={onClose}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Right Column - Sidebar */}
        <View style={styles.rightColumn}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* About Section */}
            <View style={[styles.sidebarCard, { backgroundColor: theme.card }]}>
              <View style={styles.sidebarHeader}>
                <Ionicons name="information-circle" size={20} color={theme.primary} />
                <Text style={[styles.sidebarTitle, { color: theme.text }]}>О опросе</Text>
              </View>

              {poll.description && (
                <View style={styles.sidebarSection}>
                  <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Описание</Text>
                  <Text style={[styles.sidebarValue, { color: theme.text }]}>{poll.description}</Text>
                </View>
              )}

              <View style={styles.sidebarSection}>
                <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Создатель</Text>
                <TouchableOpacity
                  style={styles.creatorButton}
                  onPress={() => poll.created_by && onUserPress(poll.created_by)}
                  activeOpacity={0.7}
                >
                  <Avatar
                    name={poll.creator?.name || 'Unknown'}
                    imageUrl={poll.creator?.avatar}
                    size={32}
                  />
                  <Text style={[styles.sidebarValue, { color: theme.text }]}>
                    {poll.creator?.name || 'Unknown'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sidebarSection}>
                <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Создан</Text>
                <Text style={[styles.sidebarValue, { color: theme.text }]}>
                  {new Date(poll.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>

              {poll.end_time && poll.status === 'active' && (
                <View style={styles.sidebarSection}>
                  <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>Дедлайн</Text>
                  <View style={styles.deadlineRow}>
                    <Ionicons name="time" size={16} color="#F59E0B" />
                    <Text style={[styles.sidebarValue, { color: '#F59E0B' }]}>
                      {new Date(poll.end_time).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long'
                      })}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.statsGrid, { borderTopColor: theme.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{poll.total_votes || 0}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Голосов</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{poll.total_voters || 0}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Участников</Text>
                </View>
              </View>
            </View>

            {/* Voters Section */}
            {showVotersColumn && (
              <View style={[styles.sidebarCard, { backgroundColor: theme.card }]}>
                <View style={styles.sidebarHeader}>
                  <Ionicons name="people" size={20} color={theme.primary} />
                  <Text style={[styles.sidebarTitle, { color: theme.text }]}>
                    Проголосовали
                  </Text>
                  {poll.total_voters > 0 && (
                    <View style={[styles.votersBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.badgeText}>{poll.total_voters}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.votersContent}>
                {votersPreview.length > 0 ? (
                  <>
                    <View style={styles.votersList}>
                      {votersPreview.map((voter) => (
                        <TouchableOpacity
                          key={voter.user_id}
                          style={[styles.voterItem, { borderBottomColor: theme.border }]}
                          onPress={() => onUserPress(voter.user_id)}
                          activeOpacity={0.7}
                        >
                          <Avatar name={voter.user_name} imageUrl={voter.avatar} size={40} />
                          <View style={styles.voterInfo}>
                            <Text
                              style={[styles.voterName, { color: theme.text }]}
                              numberOfLines={1}
                            >
                              {voter.user_name}
                            </Text>
                            {voter.options && voter.options.length > 0 && (
                              <View style={styles.voterOptions}>
                                {voter.options.map((option, index) => (
                                  <View
                                    key={index}
                                    style={[styles.optionChip, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
                                  >
                                    <Text style={[styles.optionChipText, { color: theme.primary }]} numberOfLines={1}>
                                      {option}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}
                            {voter.comment && (
                              <Text style={[styles.voterComment, { color: theme.textSecondary }]} numberOfLines={2}>
                                💬 {voter.comment}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {poll.total_voters > votersPreview.length && (
                      <TouchableOpacity
                        style={[styles.viewAllButton, { borderColor: theme.primary, backgroundColor: theme.primary + '10' }]}
                        onPress={onViewVoters}
                      >
                        <Text style={[styles.viewAllText, { color: theme.primary }]}>
                          Показать всех ({poll.total_voters})
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyVotersState}>
                    <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
                    <Text style={[styles.emptyVotersText, { color: theme.textSecondary }]}>
                      Загрузка списка проголосовавших...
                    </Text>
                  </View>
                )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
    gap: 24,
  },
  leftColumn: {
    flex: 2,
    minWidth: 500,
  },
  rightColumn: {
    flex: 1,
    minWidth: 350,
    maxWidth: 420,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 20,
  },

  // Poll Header Section
  pollHeaderSection: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  pollTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Main Content Card
  mainCard: {
    padding: 28,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  actionButtonsContainer: {
    marginTop: 0,
    marginBottom: 0,
  },
  revoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    marginTop: 20,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'background-color, border-color',
        transitionDuration: '0.15s',
      },
    }),
  },
  revoteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Results Section
  resultsSection: {
    gap: 16,
  },
  resultItem: {
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  resultPercent: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  resultBar: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  resultBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
  },
  totalVotesText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Sidebar Cards
  sidebarCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  sidebarTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  sidebarSection: {
    marginBottom: 18,
  },
  sidebarLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sidebarValue: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  creatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'background-color',
        transitionDuration: '0.15s',
      },
    }),
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 2,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Voters Section
  votersBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  votersContent: {
    gap: 2,
  },
  votersList: {
    gap: 2,
  },
  voterItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
    ...Platform.select({
      web: {
        transitionProperty: 'background-color',
        transitionDuration: '0.15s',
        cursor: 'pointer',
      },
    }),
  },
  voterInfo: {
    flex: 1,
    gap: 6,
  },
  voterName: {
    fontSize: 15,
    fontWeight: '600',
  },
  voterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  voterComment: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '0.15s',
      },
    }),
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyVotersState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyVotersText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
});
