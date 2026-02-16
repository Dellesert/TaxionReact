export type ThumbnailSize = 'small' | 'medium' | 'large';

interface ThumbnailSource {
  thumbnail_small_url?: string;
  thumbnail_medium_url?: string;
  thumbnail_large_url?: string;
  thumbnail_url?: string;
  file_url: string;
}

/**
 * Returns the best available thumbnail URL for the requested size.
 * Falls back through: requested size → medium → legacy thumbnail_url → file_url
 */
export function getThumbnailUrl(
  attachment: ThumbnailSource,
  size: ThumbnailSize,
): string {
  switch (size) {
    case 'small':
      return (
        attachment.thumbnail_small_url ||
        attachment.thumbnail_medium_url ||
        attachment.thumbnail_url ||
        attachment.file_url
      );
    case 'medium':
      return (
        attachment.thumbnail_medium_url ||
        attachment.thumbnail_url ||
        attachment.file_url
      );
    case 'large':
      return (
        attachment.thumbnail_large_url ||
        attachment.thumbnail_medium_url ||
        attachment.thumbnail_url ||
        attachment.file_url
      );
  }
}
