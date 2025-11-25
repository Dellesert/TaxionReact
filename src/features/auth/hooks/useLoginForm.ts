import { useState, useRef } from 'react';
import { TextInput } from 'react-native';

interface UseLoginFormReturn {
  email: string;
  password: string;
  showPassword: boolean;
  passwordInputRef: React.RefObject<TextInput | null>;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  togglePasswordVisibility: () => void;
}

/**
 * Hook for managing login form state
 */
export const useLoginForm = (): UseLoginFormReturn => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return {
    email,
    password,
    showPassword,
    passwordInputRef,
    setEmail,
    setPassword,
    togglePasswordVisibility,
  };
};
