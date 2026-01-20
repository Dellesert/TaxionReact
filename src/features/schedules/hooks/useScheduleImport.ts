import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';
import { scheduleApi } from '../api/schedule.api';
import type {
  ImportScheduleRequest,
  ImportPreviewResponse,
  ImportResultResponse,
} from '../types/schedule.types';

// Helper to extract error message from API response
const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data;
    // Try different error formats
    if (typeof data.error === 'string') return data.error;
    if (typeof data.details === 'string') return `${data.error || fallback}: ${data.details}`;
    if (typeof data.message === 'string') return data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
};

interface UseScheduleImportReturn {
  isLoading: boolean;
  isImporting: boolean;
  preview: ImportPreviewResponse | null;
  result: ImportResultResponse | null;
  error: string | null;
  supportedFormats: string[];
  loadPreview: (data: ImportScheduleRequest) => Promise<ImportPreviewResponse | null>;
  executeImport: (data: ImportScheduleRequest) => Promise<ImportResultResponse | null>;
  loadSupportedFormats: () => Promise<void>;
  clearPreview: () => void;
  clearResult: () => void;
  clearError: () => void;
}

export const useScheduleImport = (): UseScheduleImportReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<string[]>([]);

  const loadSupportedFormats = useCallback(async () => {
    try {
      const response = await scheduleApi.getSupportedFormats();
      setSupportedFormats(response.file_types || []);
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Не удалось загрузить форматы');
      setError(message);
    }
  }, []);

  const loadPreview = useCallback(async (data: ImportScheduleRequest) => {
    setIsLoading(true);
    setError(null);
    setPreview(null);

    try {
      const previewData = await scheduleApi.previewImport(data);
      setPreview(previewData);
      return previewData;
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Не удалось загрузить превью');
      console.error('[ScheduleImport] Preview error:', err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeImport = useCallback(async (data: ImportScheduleRequest) => {
    setIsImporting(true);
    setError(null);

    try {
      const importResult = await scheduleApi.importSchedule(data);
      setResult(importResult);
      return importResult;
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Не удалось импортировать график');
      console.error('[ScheduleImport] Import error:', err);
      setError(message);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    isImporting,
    preview,
    result,
    error,
    supportedFormats,
    loadPreview,
    executeImport,
    loadSupportedFormats,
    clearPreview,
    clearResult,
    clearError,
  };
};
