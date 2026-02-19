/**
 * Определение иконки по типу файла
 */
export const getFileIcon = (mimeType: string, fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // PDF
  if (mimeType.includes('pdf') || extension === 'pdf') {
    return 'document-text';
  }
  // Word documents
  if (mimeType.includes('word') || extension === 'doc' || extension === 'docx') {
    return 'document-text';
  }
  // Excel
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || extension === 'xls' || extension === 'xlsx') {
    return 'grid';
  }
  // PowerPoint
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation') || extension === 'ppt' || extension === 'pptx') {
    return 'easel';
  }
  // Archives
  if (extension === 'zip' || extension === 'rar' || extension === '7z' || extension === 'tar' || extension === 'gz') {
    return 'archive';
  }
  // Video
  if (mimeType.includes('video') || ['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(extension)) {
    return 'videocam';
  }
  // Audio
  if (mimeType.includes('audio') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
    return 'musical-notes';
  }
  // Code files
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'go', 'rb', 'php'].includes(extension)) {
    return 'code-slash';
  }
  // Text files
  if (mimeType.includes('text') || extension === 'txt') {
    return 'document-text-outline';
  }

  // Default
  return 'document-outline';
};

/**
 * Безопасное декодирование имени файла с поддержкой кириллицы
 */
export const decodeFileName = (fileName: string): string => {
  try {
    return decodeURIComponent(fileName);
  } catch (e) {
    return fileName;
  }
};
