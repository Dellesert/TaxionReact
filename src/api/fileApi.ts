import { API_BASE_URL } from '../shared/constants/api.constants';
import * as secureStorage from '../shared/utils/secureStorage';
import { STORAGE_KEYS } from '../shared/constants/app.constants';
import { Platform } from 'react-native';
import { ApiError, APIErrorResponse } from '@types/common.types';

export interface FileUploadResponse {
  id: number;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;        // Legacy = medium
  thumbnail_small_url?: string;  // ~100x100
  thumbnail_medium_url?: string; // ~400x300
  thumbnail_large_url?: string;  // ~800x600
  duration?: number; // Duration in seconds (for video/audio)
  uploaded_by: number;
  is_public: boolean;
  created_at: string;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

// Helper function to determine file type from MIME type
function determineFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') ||
      mimeType.includes('text') || mimeType.includes('word') ||
      mimeType.includes('excel') || mimeType.includes('powerpoint') ||
      mimeType.includes('sheet') || mimeType.includes('presentation')) {
    return 'document';
  }
  return 'attachment';
}

class FileApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/files`;
  }

  async uploadFile(
    file: File | { uri: string; name: string; type: string },
    fileType?: string,
    onProgress?: UploadProgressCallback,
    isPublic?: boolean,
    onXhrCreated?: (xhr: XMLHttpRequest) => void,
  ): Promise<FileUploadResponse> {
    const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      throw new Error('Not authenticated');
    }

    // Determine MIME type
    let mimeType = '';
    if (file instanceof File) {
      mimeType = file.type;
    } else {
      mimeType = file.type;
    }

    // Auto-detect file type if not provided
    const finalFileType = fileType || determineFileType(mimeType);

    // Use XMLHttpRequest for all platforms - it supports progress tracking everywhere
    const formData = new FormData();

    if (file instanceof File) {
      formData.append('file', file, file.name);
    } else if ('uri' in file) {
      if (Platform.OS === 'web' || file.uri.startsWith('blob:')) {
        // Web or blob: URI - convert to File/Blob
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('file', blob, file.name);
      } else {
        // React Native - use the file object directly
        // FormData on React Native accepts objects with uri, name, and type properties
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
      }
    }

    formData.append('file_type', finalFileType);
    if (isPublic !== undefined) {
      formData.append('is_public', String(isPublic));
    }

    const xhr = new XMLHttpRequest();

    return new Promise<FileUploadResponse>((resolve, reject) => {
      // Track upload progress
      // Use onprogress property (more reliable on React Native iOS than addEventListener)
      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        };
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            const apiError: ApiError = {
              message: 'Failed to parse response',
              status: xhr.status,
            };
            reject(apiError);
          }
        } else {
          // Parse structured error response
          try {
            const errorResponse: APIErrorResponse = JSON.parse(xhr.responseText);

            // Create structured ApiError
            const apiError: ApiError = {
              message: errorResponse.error || `Upload failed with status ${xhr.status}`,
              status: xhr.status,
              error_code: errorResponse.error_code,
              request_id: errorResponse.request_id,
              fields: errorResponse.fields,
              details: errorResponse,
            };

            console.error('[FileApi] Upload failed:', {
              status: xhr.status,
              error_code: errorResponse.error_code,
              request_id: errorResponse.request_id,
              message: errorResponse.error,
            });

            reject(apiError);
          } catch (e) {
            // Unable to parse error response - create basic error
            const apiError: ApiError = {
              message: `Upload failed with status ${xhr.status}`,
              status: xhr.status,
            };
            console.error('[FileApi] Upload failed (unparseable error):', {
              status: xhr.status,
              statusText: xhr.statusText,
            });
            reject(apiError);
          }
        }
      });

      xhr.addEventListener('error', () => {
        const apiError: ApiError = {
          message: 'Network error during upload',
          status: 0,
        };
        reject(apiError);
      });

      xhr.addEventListener('abort', () => {
        const apiError: ApiError = {
          message: 'Upload aborted',
          status: 0,
        };
        reject(apiError);
      });

      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.setRequestHeader('X-Session-ID', sessionId);
      onXhrCreated?.(xhr);
      xhr.send(formData);
    });
  }

  async uploadMultipleFiles(
    files: (File | { uri: string; name: string; type: string })[],
    fileType?: string,
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<FileUploadResponse[]> {
    const uploadPromises = files.map((file, index) =>
      this.uploadFile(
        file,
        fileType,
        onProgress ? (progress) => onProgress(index, progress) : undefined
      )
    );

    return Promise.all(uploadPromises);
  }

  async getFileById(fileId: number): Promise<FileUploadResponse> {
    const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      headers: {
        'X-Session-ID': sessionId,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ getFileById error response:', errorText);
      throw new Error(`Failed to get file: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteFile(fileId: number): Promise<void> {
    const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      method: 'DELETE',
      headers: {
        'X-Session-ID': sessionId,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }

  getFileUrl(fileId: number): string {
    return `${this.baseUrl}/${fileId}`;
  }

  getDownloadUrl(fileName: string): string {
    return `${this.baseUrl}/download/${fileName}`;
  }

  getPublicFileUrl(fileName: string): string {
    return `${this.baseUrl}/public/${fileName}`;
  }
}

export const fileApi = new FileApi();
