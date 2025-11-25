/**
 * PollDetailModal
 * Модальное окно для отображения деталей опроса из чата
 * Использует существующий PollDetailScreen, обернутый в модальное окно
 */

import React, { useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import PollDetailScreen from '../screens/PollDetailScreen';
import { NavigationContext } from '@react-navigation/native';
// @ts-ignore - internal API
import { NavigationRouteContext } from '@react-navigation/native';

interface PollDetailModalProps {
  visible: boolean;
  pollId: number;
  onClose: () => void;
}

const PollDetailModal: React.FC<PollDetailModalProps> = ({ visible, pollId, onClose }) => {
  const { theme } = useTheme();
  const [headerOptions, setHeaderOptions] = React.useState<any>({});

  // Create a minimal navigation state
  const navigationState = useMemo(() => ({
    key: 'modal-root',
    index: 0,
    routeNames: ['PollDetail'],
    routes: [
      {
        key: `poll-${pollId}`,
        name: 'PollDetail',
        params: {
          pollId,
          fromChat: true,
        },
      },
    ],
    stale: false,
    type: 'stack',
  }), [pollId]);

  // Create mock navigation helpers
  const navigation = useMemo(() => ({
    navigate: () => {},
    goBack: onClose,
    setOptions: (options: any) => {
      setHeaderOptions(options);
    },
    getParent: () => null,
    addListener: () => () => {},
    removeListener: () => {},
    isFocused: () => true,
    canGoBack: () => false,
    getId: () => undefined,
    getState: () => navigationState,
    dispatch: () => {},
    reset: () => {},
    setParams: () => {},
  }), [onClose, navigationState]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header bar with back button, title and action buttons */}
        <View style={[styles.headerBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            {headerOptions.title && (
              <Text
                style={[styles.headerTitle, { color: theme.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {headerOptions.title}
              </Text>
            )}
          </View>

          <View style={styles.headerRight}>
            {headerOptions.headerRight && headerOptions.headerRight()}
          </View>
        </View>

        {/* Poll Detail Screen with Navigation Context */}
        <NavigationContext.Provider value={navigation as any}>
          <NavigationRouteContext.Provider value={navigationState.routes[0] as any}>
            <PollDetailScreen />
          </NavigationRouteContext.Provider>
        </NavigationContext.Provider>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingTop: 50,
    borderBottomWidth: 1,
    zIndex: 10,
    height: 100,
  },
  headerLeft: {
    width: 60,
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingRight: 8,
  },
});

export default PollDetailModal;
