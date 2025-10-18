import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem } from '@components/task/TaskItem';
import { Loading } from '@components/common/Loading';
import { Task, TaskStatus } from '@types/task.types';
import { useTaskStore } from '@store/taskStore';
import { useTheme } from '@hooks/useTheme';
import { TaskStackParamList } from '@navigation/types';

type TaskFilter = 'all' | 'todo' | 'in_progress' | 'review' | 'done';
type NavigationProp = NativeStackNavigationProp<TaskStackParamList, 'TaskList'>;

const TaskListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { tasks, isLoading, loadTasks: fetchTasks } = useTaskStore();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      await fetchTasks();
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleTaskPress = (task: Task) => {
    console.log('Task pressed:', task.id);
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  const handleNewTask = () => {
    console.log('Create new task');
    navigation.navigate('CreateTask');
  };

  const filteredTasks = tasks
    .filter((task) => {
      if (filter !== 'all' && task.status !== filter) return false;
      if (!searchQuery) return true;
      const searchText = `${task.title} ${task.description || ''}`.toLowerCase();
      return searchText.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;

      if (aPriority !== bPriority) return aPriority - bPriority;

      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }

      return 0;
    });

  const filterButtons: { key: TaskFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'Все', icon: 'apps-outline' },
    { key: 'todo', label: 'Новые', icon: 'time-outline' },
    { key: 'in_progress', label: 'В работе', icon: 'play-circle-outline' },
    { key: 'done', label: 'Готовые', icon: 'checkmark-circle-outline' },
  ];

  if (isLoading && tasks.length === 0) {
    return <Loading text="Загрузка задач..." fullScreen />;
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingBottom: 8,
      paddingTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.input,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: theme.text,
    },
    filterButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.backgroundTertiary,
    },
    filterButtonActive: {
      backgroundColor: theme.primary,
    },
    filterButtonText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textTertiary,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
      <View style={dynamicStyles.header}>
        <View style={styles.headerTop}>
          <Text style={dynamicStyles.title}>Задачи</Text>
          <TouchableOpacity onPress={handleNewTask} style={styles.addButton}>
            <Ionicons name="add" size={26} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.textTertiary} />
          <TextInput
            style={dynamicStyles.searchInput}
            placeholder="Поиск задач..."
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterContainer}>
          {filterButtons.map((btn, index) => (
            <TouchableOpacity
              key={btn.key}
              onPress={() => setFilter(btn.key)}
              style={[
                dynamicStyles.filterButton,
                filter === btn.key && dynamicStyles.filterButtonActive,
                index > 0 && styles.filterButtonMargin,
              ]}
            >
              <Ionicons
                name={btn.icon as any}
                size={16}
                color={filter === btn.key ? 'white' : theme.textSecondary}
              />
              <Text
                style={[
                  dynamicStyles.filterButtonText,
                  filter === btn.key && styles.filterButtonTextActive,
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-done-outline" size={64} color={theme.borderLight} />
          <Text style={dynamicStyles.emptyTitle}>
            {searchQuery ? 'Задачи не найдены' : 'Нет задач'}
          </Text>
          <Text style={dynamicStyles.emptySubtitle}>
            {searchQuery
              ? 'Попробуйте изменить поисковый запрос'
              : 'Создайте новую задачу для начала работы'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TaskItem task={item} onPress={handleTaskPress} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButtonMargin: {
    marginLeft: 8,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
});

export default TaskListScreen;
