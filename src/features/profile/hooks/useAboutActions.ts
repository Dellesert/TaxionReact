/**
 * Custom Hook: useAboutActions
 * Управление действиями на экране "О приложении"
 */

import { useCallback } from 'react';
import { Linking } from 'react-native';
import { WEBSITE_URL, SUPPORT_EMAIL } from '../utils/aboutConstants';

interface UseAboutActionsReturn {
  handleOpenWebsite: () => Promise<void>;
  handleOpenEmail: () => Promise<void>;
}

export const useAboutActions = (): UseAboutActionsReturn => {
  const handleOpenWebsite = useCallback(async () => {
    try {
      await Linking.openURL(WEBSITE_URL);
    } catch (error) {
      console.error('Failed to open website:', error);
    }
  }, []);

  const handleOpenEmail = useCallback(async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    } catch (error) {
      console.error('Failed to open email:', error);
    }
  }, []);

  return {
    handleOpenWebsite,
    handleOpenEmail,
  };
};
