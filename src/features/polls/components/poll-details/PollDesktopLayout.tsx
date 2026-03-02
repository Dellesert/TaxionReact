/**
 * Poll Desktop Layout
 * Компонент для отображения деталей опроса на широких экранах
 * Layout: Две колонки - Обзор (слева) + Табы: Результаты/Проголосовавшие (справа)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import type { Poll, PollVoter } from '../../types/poll.types';
import { PollInfo } from './PollInfo';
import { PollVotingUI } from '../voting/PollVotingUI';
import { PollActionButtons } from '../voting/PollActionButtons';

type DesktopTabType = 'results' | 'voters';

const TAB_CONFIG: { key: DesktopTabType; icon: string; label: string }[] = [
  { key: 'results', icon: 'bar-chart-outline', label: 'Результаты' },
  { key: 'voters', icon: 'people-outline', label: 'Проголосовавшие' },
];

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
  onViewVoters,
}) => {
  const { theme, isDark } = useTheme();
  const cardBgColor = isDark ? theme.card : '#FFFFFF';
  const [activeRightTab, setActiveRightTab] = useState<DesktopTabType>('results');
  const [hoveredCard, setHoveredCard] = useState<'left' | 'right' | null>(null);
  const [hoveredTab, setHoveredTab] = useState<DesktopTabType | null>(null);

  const hasResults = showResultsSection && poll.options && poll.options.length > 0 &&
    poll.options.some(opt => opt.vote_count !== undefined);

  const getBadgeCount = (tab: DesktopTabType): number => {
    switch (tab) {
      case 'results': return poll.options?.length || 0;
      case 'voters': return poll.total_voters || 0;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.columnsRow}>
        {/* LEFT COLUMN - Poll Overview */}
        <View
          style={styles.leftColumn}
          // @ts-ignore - web-only props
          onMouseEnter={Platform.OS === 'web' ? () => setHoveredCard('left') : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setHoveredCard(null) : undefined}
        >
          <View style={[
            styles.leftCard,
            { backgroundColor: cardBgColor, borderColor: theme.border },
            hoveredCard === 'left' && styles.cardHovered,
          ]}>
            {/* Left card header */}
            <View style={[styles.leftCardHeader, { borderBottomColor: theme.border }]}>
              <Ionicons name="stats-chart-outline" size={18} color={theme.primary} />
              <Text style={[styles.leftCardTitle, { color: theme.text }]}>Опрос</Text>
            </View>
            <ScrollView
              style={[styles.leftCardScroll, { backgroundColor: theme.background }]}
              contentContainerStyle={styles.leftCardContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {/* Poll Info */}
              <PollInfo poll={poll} onUserPress={onUserPress} />

              {/* Voting UI */}
              {(showVotingUI || isRevoting) && (
                <View style={styles.votingSection}>
                  <View style={[styles.votingSectionHeader, { borderTopColor: theme.border }]}>
                    <Ionicons name="create-outline" size={18} color={theme.primary} />
                    <Text style={[styles.votingSectionTitle, { color: theme.text }]}>
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
                </View>
              )}

              {/* Action Buttons */}
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
              />
            </ScrollView>
          </View>
        </View>

        {/* RIGHT COLUMN - Tabbed Panel */}
        <View
          style={styles.rightColumn}
          // @ts-ignore - web-only props
          onMouseEnter={Platform.OS === 'web' ? () => setHoveredCard('right') : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setHoveredCard(null) : undefined}
        >
          <View style={[
            styles.rightCard,
            { backgroundColor: cardBgColor, borderColor: theme.border },
            hoveredCard === 'right' && styles.cardHovered,
          ]}>
            {/* Right card header */}
            <View style={[styles.rightCardHeader, { borderBottomColor: theme.border }]}>
              <Ionicons name="document-text-outline" size={18} color={theme.primary} />
              <Text style={[styles.rightCardTitle, { color: theme.text }]}>Детали</Text>
            </View>

            {/* Tab Bar */}
            <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
              {TAB_CONFIG.map(({ key, icon, label }) => {
                const isActive = activeRightTab === key;
                const isHovered = hoveredTab === key;
                const count = getBadgeCount(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.tabItem,
                      isActive && { borderBottomColor: theme.primary },
                      isHovered && !isActive && styles.tabItemHovered,
                    ]}
                    onPress={() => setActiveRightTab(key)}
                    activeOpacity={0.7}
                    // @ts-ignore - web-only props
                    onMouseEnter={Platform.OS === 'web' ? () => setHoveredTab(key) : undefined}
                    onMouseLeave={Platform.OS === 'web' ? () => setHoveredTab(null) : undefined}
                  >
                    <Ionicons
                      name={icon as any}
                      size={18}
                      color={isActive ? theme.primary : theme.textSecondary}
                    />
                    <Text style={[
                      styles.tabLabel,
                      { color: isActive ? theme.primary : theme.textSecondary },
                      isActive && { fontWeight: '700' },
                    ]}>
                      {label}
                    </Text>
                    {count > 0 && (
                      <View style={[
                        styles.tabBadge,
                        { backgroundColor: isActive ? theme.primary : theme.backgroundTertiary },
                      ]}>
                        <Text style={[
                          styles.tabBadgeText,
                          { color: isActive ? '#FFFFFF' : theme.textSecondary },
                        ]}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab Content */}
            {activeRightTab === 'results' && (
              <ScrollView
                style={[styles.tabContent, { backgroundColor: theme.background }]}
                contentContainerStyle={styles.tabContentInner}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {hasResults ? (
                  <>
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
                        <Ionicons name="refresh" size={18} color={theme.primary} />
                        <Text style={[styles.revoteButtonText, { color: theme.primary }]}>
                          Переголосовать
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="bar-chart-outline" size={48} color={theme.textSecondary} />
                    <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                      {poll.status === 'draft' ? 'Опрос ещё не опубликован' : 'Результатов пока нет'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {activeRightTab === 'voters' && (
              <ScrollView
                style={[styles.tabContent, { backgroundColor: theme.background }]}
                contentContainerStyle={styles.tabContentInner}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
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
                          <Avatar name={voter.user_name} imageUrl={voter.avatar} size={32} />
                          <View style={styles.voterInfo}>
                            <Text
                              style={[styles.voterName, { color: theme.text }]}
                              numberOfLines={1}
                            >
                              {voter.user_name}
                            </Text>
                            {voter.options && voter.options.length > 0 && (
                              <View style={styles.voterOptions}>
                                {voter.options.map((option: string, index: number) => (
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
                                {voter.comment}
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
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
                    <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                      {poll.status === 'draft' ? 'Опрос ещё не опубликован' : 'Пока никто не проголосовал'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 24,
  },

  // Left column
  leftColumn: {
    flex: 2,
    minWidth: 360,
    maxWidth: 600,
  },
  leftCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transitionProperty: 'box-shadow, transform',
        transitionDuration: '0.2s',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  leftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 20,
    paddingRight: 12,
    paddingVertical: 8,
    minHeight: 56,
    borderBottomWidth: 1,
  },
  leftCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  leftCardScroll: {
    flex: 1,
  },
  leftCardContent: {
    padding: 14,
  },

  // Right column
  rightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 20,
    paddingRight: 12,
    paddingVertical: 8,
    minHeight: 56,
    borderBottomWidth: 1,
  },
  rightCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  rightColumn: {
    flex: 3,
    minWidth: 400,
  },
  rightCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transitionProperty: 'box-shadow, transform',
        transitionDuration: '0.2s',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },

  cardHovered: {
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transform: 'translateY(-2px)',
      },
      default: {
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },

  // Voting section inside left card
  votingSection: {
    marginTop: 8,
  },
  votingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    marginBottom: 12,
    borderTopWidth: 1,
  },
  votingSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    ...Platform.select({
      web: {
        // @ts-ignore
        cursor: 'pointer',
        transitionProperty: 'border-color, background-color',
        transitionDuration: '0.15s',
      },
    }),
  },
  tabItemHovered: {
    ...Platform.select({
      web: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
      },
    }),
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },

  // Tab content
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },

  // Results
  resultItem: {
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
    marginRight: 12,
  },
  resultPercent: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  resultBar: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
    ...Platform.select({
      web: {
        // @ts-ignore
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
    lineHeight: 18,
  },
  totalVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalVotesText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  revoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    gap: 6,
    marginTop: 12,
    ...Platform.select({
      web: {
        // @ts-ignore
        cursor: 'pointer',
        transitionProperty: 'background-color, border-color, opacity',
        transitionDuration: '0.15s',
      },
    }),
  },
  revoteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },

  // Voters
  votersList: {
    gap: 2,
  },
  voterItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
    ...Platform.select({
      web: {
        transitionProperty: 'background-color',
        transitionDuration: '0.15s',
        // @ts-ignore
        cursor: 'pointer',
      },
    }),
  },
  voterInfo: {
    flex: 1,
    gap: 6,
  },
  voterName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
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
    borderRadius: 10,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
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
    gap: 6,
    marginTop: 12,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    ...Platform.select({
      web: {
        // @ts-ignore
        cursor: 'pointer',
        transitionProperty: 'transform, box-shadow, opacity',
        transitionDuration: '0.15s',
      },
    }),
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
  },
});
