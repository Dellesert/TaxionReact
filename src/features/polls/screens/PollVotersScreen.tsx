import React from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';
import { usePollVotersData } from '../hooks/usePollVotersData';
import { PollVotersHeader } from '@screens/poll/components/PollVotersHeader';
import { PollVotersControls } from '@screens/poll/components/PollVotersControls';
import { PollVoterCard } from '@screens/poll/components/PollVoterCard';
import { PollVotersByOption } from '@screens/poll/components/PollVotersByOption';
import { PollVotersEmptyState } from '@screens/poll/components/PollVotersEmptyState';
import { PollErrorState } from '@screens/poll/components/PollErrorState';

type PollStackParamList = {
  PollList: undefined;
  PollDetail: { pollId: number };
  EditPoll: { pollId: number };
  PollVoters: { pollId: number };
};

type PollVotersScreenRouteProp = RouteProp<PollStackParamList, 'PollVoters'>;
type PollVotersScreenNavigationProp = NativeStackNavigationProp<
  PollStackParamList,
  'PollVoters'
>;

const PollVotersScreen: React.FC = () => {
  const navigation = useNavigation<PollVotersScreenNavigationProp>();
  const route = useRoute<PollVotersScreenRouteProp>();
  const { theme } = useTheme();
  const { showError } = useNotification();

  // Custom hook for voters data
  const {
    votersData,
    isLoading,
    error,
    viewMode,
    votersByOption,
    setViewMode,
    loadVoters,
  } = usePollVotersData(route.params.pollId, () => {
    showError('У вас нет прав для просмотра списка проголосовавших');
    navigation.goBack();
  });

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={['top']}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={['top']}
      >
        <PollErrorState error={error} onRetry={loadVoters} onGoBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  // Empty state
  if (!votersData || votersData.voters.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={['top']}
      >
        <PollVotersHeader onBack={() => navigation.goBack()} />
        <PollVotersEmptyState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      {/* Header */}
      <PollVotersHeader onBack={() => navigation.goBack()} />

      {/* Controls */}
      <PollVotersControls
        totalVoters={votersData.total_voters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Content */}
      {viewMode === 'users' ? (
        <FlatList
          data={votersData.voters}
          renderItem={({ item }) => <PollVoterCard voter={item} />}
          keyExtractor={(item) => item.user_id.toString()}
          contentContainerStyle={styles.list}
        />
      ) : (
        <PollVotersByOption votersByOption={votersByOption} />
      )}
    </SafeAreaView>
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
  list: {
    padding: 16,
  },
});

export default PollVotersScreen;
