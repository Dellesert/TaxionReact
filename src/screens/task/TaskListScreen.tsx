import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem } from '@components/task/TaskItem';
import { Loading } from '@components/common/Loading';
import { Task } from '@types/task.types';
import { taskApi } from '@api/task.api';

type TaskFilter = 'all' | 'pending' | 'in_progress' | 'completed';

const TaskListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const response = await taskApi.getTasks();
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleTaskPress = (task: Task) => {
    navigation.navigate('TaskDetail' as never, { taskId: task.id } as never);
  };

  const handleNewTask = () => {
    // TODO: Navigate to create task screen
    console.log('Create new task');
  };

  const filteredTasks = tasks
    .filter((task) => {
      if (filter !== 'all' && task.status !== filter) return false;
      if (!searchQuery) return true;
      const searchText = `${task.title} ${task.description || ''}`.toLowerCase();
      return searchText.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Сортируем по приоритету и сроку
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
    { key: 'pending', label: 'Ожидают', icon: 'time-outline' },
    { key: 'in_progress', label: 'В работе', icon: 'play-circle-outline' },
    { key: 'completed', label: 'Завершены', icon: 'checkmark-circle-outline' },
  ];

  if (isLoading) {
    return <Loading text="Загрузка задач..." fullScreen />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-3 pb-2 border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900">Задачи</Text>
          <TouchableOpacity
            onPress={handleNewTask}
            className="bg-blue-500 rounded-full w-10 h-10 items-center justify-center"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Поиск задач..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row space-x-2">
          {filterButtons.map((btn) => (
            <TouchableOpacity
              key={btn.key}
              onPress={() => setFilter(btn.key)}
              className={`flex-1 flex-row items-center justify-center py-2 px-3 rounded-lg ${
                filter === btn.key ? 'bg-blue-500' : 'bg-gray-100'
              }`}
            >
              <Ionicons
                name={btn.icon as any}
                size={16}
                color={filter === btn.key ? 'white' : '#6B7280'}
              />
              <Text
                className={`text-xs ml-1 ${
                  filter === btn.key ? 'text-white font-semibold' : 'text-gray-600'
                }`}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredTasks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="checkmark-done-outline" size={64} color="#D1D5DB" />
          <Text className="text-lg font-semibold text-gray-600 mt-4">
            {searchQuery ? 'Задачи не найдены' : 'Нет задач'}
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-2">
            {searchQuery
              ? 'Попробуйте изменить поисковый запрос'
              : 'Создайте новую задачу для начала работы'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskItem task={item} onPress={handleTaskPress} />}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

export default TaskListScreen;
