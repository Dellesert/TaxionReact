import { API_BASE_URL } from '../constants/api.constants';
import * as secureStorage from '../utils/secureStorage';
import { STORAGE_KEYS } from '../constants/app.constants';

export interface FileUploadResponse {
  id: number;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
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
    isPublic?: boolean
  ): Promise<FileUploadResponse> {
    const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
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

    // For React Native, use fetch API which properly handles file uploads
    if ('uri' in file && !file.uri.startsWith('blob:')) {
      const formData = new FormData();

      // React Native needs the file in this exact format
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);

      formData.append('file_type', finalFileType);
      if (isPublic !== undefined) {
        formData.append('is_public', String(isPublic));
      }

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let fetch set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      return await response.json();
    }

    // For web (File object or blob: URIs), use XMLHttpRequest
    const formData = new FormData();

    if (file instanceof File) {
      formData.append('file', file, file.name);
    } else {
      // blob: URI - convert to File
      const response = await fetch(file.uri);
      const blob = await response.blob();
      formData.append('file', blob, file.name);
    }

    formData.append('file_type', finalFileType);
    if (isPublic !== undefined) {
      formData.append('is_public', String(isPublic));
    }

    const xhr = new XMLHttpRequest();

    return new Promise<FileUploadResponse>((resolve, reject) => {
      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          // Log full error response
          console.error('Upload failed:', {
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText
          });
          let errorMessage = `Upload failed with status ${xhr.status}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error) {
              errorMessage += `: ${errorResponse.error}`;
            }
          } catch (e) {
            // Unable to parse error response
          }
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
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
    const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get file: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteFile(fileId: number): Promise<void> {
    const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
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
