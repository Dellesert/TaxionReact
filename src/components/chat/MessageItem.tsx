import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Dimensions, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Message } from '../../types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { UserProfileModal } from '@components/common/UserProfileModal';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { getUser } from '@api/user.api';
import { User } from '../../types/user.types';
import { Ionicons } from '@expo/vector-icons';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';

interface MessageItemProps {
  message: Message;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: number, deleteFor: 'everyone' | 'me') => void;
  onRestore?: (messageId: number) => void;
  onPin?: (messageId: number) => void;
  onUnpin?: (messageId: number) => void;
  onForward?: (message: Message) => void;
  onReplyPress?: (messageId: number) => void;
  isHighlighted?: boolean;
  userRole?: 'owner' | 'admin' | 'member';
  chatMemberIds?: number[]; // ID участников чата для определения статуса "доставлено"
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onReply,
  onEdit,
  onDelete,
  onRestore,
  onPin,
  onUnpin,
  onForward,
  onReplyPress,
  isHighlighted = false,
  userRole = 'member',
  chatMemberIds = [],
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const { theme } = useTheme();
  const [sender, setSender] = useState<User | null>(null);
  const [replySender, setReplySender] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<{ [key: number]: string }>({});
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const messageBubbleRef = useRef<View>(null);

  // Check if file is an image
  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  // Load images with authorization
  useEffect(() => {
    const loadImages = async () => {
      console.log('📎 MessageItem loadImages - message.id:', message.id, 'attachments:', message.attachments);

      if (!message.attachments || message.attachments.length === 0) {
        console.log('⚠️ No attachments in message', message.id);
        return;
      }

      console.log('📎 Found', message.attachments.length, 'attachments for message', message.id);

      const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        console.error('❌ No access token for loading images');
        return;
      }

      console.log('✅ Got access token for loading images');

      for (const attachment of message.attachments) {
        console.log('📎 Processing attachment:', {
          id: attachment.id,
          mime_type: attachment.mime_type,
          file_type: attachment.file_type,
          file_url: attachment.file_url
        });

        const mimeType = attachment.mime_type || attachment.file_type || '';
        if (isImageFile(mimeType) && !imageUrls[attachment.id]) {
          try {
            // Replace localhost with real IP on ALL platforms
            // Бэкенд возвращает localhost который не работает кросс-платформенно
            const fileUrl = attachment.file_url.replace('http://localhost:8080', 'http://192.168.1.160:8080');
            console.log('📸 Loading image from:', fileUrl);

            const response = await fetch(fileUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const blob = await response.blob();

              if (Platform.OS === 'web') {
                // На Web используем blob URL (быстрее и меньше памяти)
                const imageUrl = URL.createObjectURL(blob);
                setImageUrls(prev => ({ ...prev, [attachment.id]: imageUrl }));
                console.log('✅ Loaded image preview (blob URL) for attachment ID:', attachment.id);
              } else {
                // На React Native конвертируем blob в base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);

                reader.onloadend = () => {
                  const base64data = reader.result as string;
                  setImageUrls(prev => ({ ...prev, [attachment.id]: base64data }));
                  console.log('✅ Loaded image preview (base64) for attachment ID:', attachment.id);
                };

                reader.onerror = (error) => {
                  console.error('❌ Failed to convert blob to base64:', error);
                };
              }
            } else {
              console.error('❌ Failed to load image, status:', response.status);
            }
          } catch (error) {
            console.error('❌ Failed to load image preview:', error);
          }
        }
      }
    };

    loadImages();

    // Cleanup blob URLs on unmount (только для веб)
    return () => {
      if (Platform.OS === 'web') {
        Object.values(imageUrls).forEach(url => {
          // Только blob URLs нужно освобождать (не base64)
          if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
      }
    };
  }, [message.attachments]);

  // Fetch sender
  useEffect(() => {
    console.log('🔄 MessageItem effect running for message:', message.id);
    console.log('🔄 message.sender:', message.sender);
    console.log('🔄 message.sender_id:', message.sender_id);

    if (message.sender) {
      console.log('✅ Sender already in message:', message.sender);
      setSender(message.sender);
    } else if (message.sender_id) {
      console.log('📥 Fetching sender for message:', message.id, 'sender_id:', message.sender_id);
      getUser(message.sender_id)
        .then((user) => {
          console.log('✅ Fetched sender:', user);
          setSender(user);
        })
        .catch((error) => {
          console.error('❌ Failed to fetch sender:', error);
        });
    }
  }, [message.id, message.sender, message.sender_id]);

  // Fetch reply sender
  useEffect(() => {
    if (message.reply_to && message.reply_to.sender_id) {
      console.log('🔄 Fetching reply sender for message:', message.reply_to.id, 'sender_id:', message.reply_to.sender_id);

      if (message.reply_to.sender) {
        console.log('✅ Reply sender already in message:', message.reply_to.sender);
        setReplySender(message.reply_to.sender);
      } else {
        console.log('📥 Fetching reply sender from API');
        getUser(message.reply_to.sender_id)
          .then((user) => {
            console.log('✅ Fetched reply sender:', user);
            setReplySender(user);
          })
          .catch((error) => {
            console.error('❌ Failed to fetch reply sender:', error);
          });
      }
    }
  }, [message.reply_to?.id, message.reply_to?.sender_id, message.reply_to?.sender]);

  const isOwnMessage = message.sender_id === currentUser?.id;
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  // Логирование для отладки
  useEffect(() => {
    console.log('📨 Message permissions:', {
      messageId: message.id,
      senderId: message.sender_id,
      currentUserId: currentUser?.id,
      isOwnMessage,
      userRole,
      isAdmin,
      is_deleted: message.is_deleted,
      canDeleteForEveryone: isOwnMessage || isAdmin,
    });
  }, [message.id, message.sender_id, currentUser?.id, isOwnMessage, userRole, isAdmin, message.is_deleted]);

  // Проверяем, является ли сообщение пересланным
  const isForwardedMessage = message.content.startsWith('📩 Переслано от ');

  const handleLongPress = () => {
    messageBubbleRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      const menuWidth = 250;
      const menuHeight = 450; // Примерная высота меню с превью сообщения

      // Позиционируем меню в зависимости от того, чье это сообщение
      // Для своих сообщений - справа, для чужих - слева
      const left = isOwnMessage
        ? screenWidth - menuWidth - 20  // Свои сообщения: меню справа
        : 20;                            // Чужие сообщения: меню слева

      // Рассчитываем позицию меню
      let top = y; // Начинаем от верхней границы сообщения

      // Если меню не помещается внизу, поднимаем выше
      if (top + menuHeight > screenHeight - 20) {
        top = Math.max(20, screenHeight - menuHeight - 20);
      }

      setMenuPosition({ top, left });
      setShowContextMenu(true);
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Рендер индикатора статуса для своих сообщений
  const renderMessageStatus = () => {
    if (!isOwnMessage || message.is_deleted) return null;

    // Если сообщение еще отправляется
    if (message.sending) {
      return (
        <ActivityIndicator
          size="small"
          color={theme.textTertiary}
          style={styles.statusIcon}
        />
      );
    }

    // Определяем количество прочитавших (исключая себя)
    const readByArray = message.read_by || [];
    const readReceiptsArray = message.read_receipts || [];
    const deliveredToArray = message.delivered_to || [];

    const readByOthers = readByArray.filter(id => id !== currentUser?.id);
    const readReceiptsByOthers = readReceiptsArray.filter(r => r.user_id !== currentUser?.id);

    const hasRead = readByOthers.length > 0 || readReceiptsByOthers.length > 0;
    const hasDelivered = deliveredToArray.length > 0;

    // Если прочитано кем-то (две зелёные галочки)
    if (hasRead) {
      return (
        <Ionicons
          name="checkmark-done"
          size={16}
          color="#4CAF50"
          style={styles.statusIcon}
        />
      );
    }

    // Если доставлено хотя бы одному (две серые галочки)
    if (hasDelivered && message.id) {
      return (
        <Ionicons
          name="checkmark-done"
          size={16}
          color={theme.textTertiary}
          style={styles.statusIcon}
        />
      );
    }

    // Если отправлено на сервер (одна серая галочка)
    if (message.id) {
      return (
        <Ionicons
          name="checkmark"
          size={16}
          color={theme.textTertiary}
          style={styles.statusIcon}
        />
      );
    }

    // Не должно попасть сюда
    return null;
  };

  const handleUserPress = async () => {
    console.log('👤 User pressed!');

    // Если sender уже есть - используем его
    let senderData = sender || message.sender;

    // Если нет - загружаем прямо сейчас
    if (!senderData && message.sender_id) {
      console.log('📥 Fetching sender on click...');
      try {
        senderData = await getUser(message.sender_id);
        setSender(senderData); // Сохраняем для следующего раза
      } catch (error) {
        console.error('❌ Failed to fetch sender on click:', error);
      }
    }

    // Открываем модальное окно
    if (senderData) {
      setShowProfileModal(true);
    }
  };

  const handleCopyMessage = async () => {
    try {
      // Проверяем, доступен ли Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message.content);
        console.log('✅ Message copied to clipboard:', message.content);
        Alert.alert('Скопировано', 'Текст сообщения скопирован в буфер обмена');
      } else {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = message.content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          console.log('✅ Message copied using fallback method');
          Alert.alert('Скопировано', 'Текст сообщения скопирован в буфер обмена');
        } catch (err) {
          console.error('❌ Failed to copy using fallback:', err);
          Alert.alert('Ошибка', 'Не удалось скопировать текст');
        }

        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('❌ Failed to copy message:', error);
      Alert.alert('Ошибка', 'Не удалось скопировать текст');
    }
  };

  const dynamicStyles = StyleSheet.create({
    messageBubble: {
      backgroundColor: theme.messageOther,
    },
    ownMessageBubble: {
      backgroundColor: theme.messageOwn,
    },
    senderName: {
      color: theme.primary,
    },
    messageText: {
      color: theme.text,
    },
    ownMessageText: {
      color: theme.text,
    },
    time: {
      color: theme.textTertiary,
    },
    ownTime: {
      color: theme.textTertiary,
    },
    edited: {
      color: theme.textTertiary,
    },
    ownEdited: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
  });

  return (
    <View style={[styles.container, isOwnMessage && styles.ownMessageContainer]}>
      {!isOwnMessage && (
        <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
          <Avatar
            imageUrl={sender?.avatar}
            name={sender?.name || `User ${message.sender_id}`}
            size={32}
            style={styles.avatar}
          />
        </TouchableOpacity>
      )}
   <TouchableOpacity
  ref={messageBubbleRef}
  activeOpacity={0.9}
  onLongPress={handleLongPress}
  style={[
    styles.messageBubble,
    dynamicStyles.messageBubble,
    isOwnMessage && [styles.ownMessageBubble, dynamicStyles.ownMessageBubble],
    isHighlighted && [styles.highlightedBubble, { backgroundColor: theme.primary + '40' }],
    isForwardedMessage && [styles.forwardedBubble, { borderLeftColor: theme.primary }],
  ]}
>
  {!isOwnMessage && <View style={[styles.tail, { backgroundColor: theme.messageOther }]} />}
  {isOwnMessage && <View style={[styles.tailOwn, { backgroundColor: theme.messageOwn }]} />}

  {/* Имя отправителя для чужих сообщений */}
  {!isOwnMessage && (
    <Text style={[styles.senderName, dynamicStyles.senderName]}>
      {sender?.name || `User ${message.sender_id}`}
    </Text>
  )}

  {/* Цитируемое сообщение (если это ответ) */}
  {message.reply_to && (
    <TouchableOpacity
      style={[styles.replyContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)', borderLeftColor: theme.primary }]}
      onPress={() => onReplyPress?.(message.reply_to_id!)}
      activeOpacity={0.7}
    >
      <Text style={[styles.replySender, { color: theme.primary }]} numberOfLines={1}>
        {replySender?.name || message.reply_to.sender?.name || `User ${message.reply_to.sender_id}`}
      </Text>
      <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={2}>
        {message.reply_to.content}
      </Text>
    </TouchableOpacity>
  )}

  {/* Контент сообщения */}
  <View style={styles.messageContentRow}>
    {message.is_deleted ? (
      <View style={styles.deletedMessageContainer}>
        <Ionicons name="trash-outline" size={16} color={theme.textTertiary} style={[styles.deletedIcon, { opacity: 0.6 }]} />
        <Text style={[styles.deletedText, { color: theme.textTertiary, opacity: 0.6 }]}>
          {isAdmin ? '🗑️ Сообщение удалено' : 'Сообщение удалено'}
        </Text>
        {isAdmin && onRestore && (
          <TouchableOpacity
            style={[styles.restoreButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              console.log('🔄 Restore button clicked for message:', message.id);
              onRestore(message.id);
            }}
          >
            <Text style={styles.restoreButtonText}>Восстановить</Text>
          </TouchableOpacity>
        )}
      </View>
    ) : (
      <View style={styles.messageContent}>
        {/* Render text first */}
        {message.content && (
          <Text
            style={[
              styles.messageText,
              dynamicStyles.messageText,
              isOwnMessage && dynamicStyles.ownMessageText,
            ]}
          >
            {message.content}
          </Text>
        )}

        {/* Render attachments below text */}
        {message.attachments && message.attachments.length > 0 && (() => {
          const images = message.attachments.filter(a => isImageFile(a.mime_type));
          const files = message.attachments.filter(a => !isImageFile(a.mime_type));
          const imageCount = images.length;

          // Determine image size based on count
          const getImageSize = () => {
            if (imageCount === 1) return { width: 250, height: 250 };
            if (imageCount === 2) return { width: 120, height: 120 };
            if (imageCount === 3) return { width: 120, height: 120 };
            return { width: 115, height: 115 }; // 4 or more
          };

          const imageSize = getImageSize();

          return (
            <View style={styles.attachmentsContainer}>
              {/* Render images in grid */}
              {images.length > 0 && (
                <View style={[
                  styles.imagesGrid,
                  imageCount === 1 && styles.imagesGridSingle,
                  imageCount === 2 && styles.imagesGridDouble,
                  imageCount >= 3 && styles.imagesGridMultiple,
                ]}>
                  {images.map((attachment, index) => (
                    <TouchableOpacity
                      key={attachment.id || index}
                      style={[
                        styles.imageAttachment,
                        { width: imageSize.width, height: imageSize.height },
                        imageCount > 1 && styles.imageAttachmentGrid,
                      ]}
                      onPress={() => {
                        const imageUrl = imageUrls[attachment.id];
                        if (imageUrl) {
                          console.log('🖼️ Opening image in fullscreen');
                          setSelectedImage(imageUrl);
                          setShowImageViewer(true);
                        } else {
                          Alert.alert('Ошибка', 'Изображение еще загружается');
                        }
                      }}
                    >
                      {imageUrls[attachment.id] ? (
                        <Image
                          source={{ uri: imageUrls[attachment.id] }}
                          style={[styles.imagePreview, { width: imageSize.width, height: imageSize.height }]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[
                          styles.imagePreview,
                          { width: imageSize.width, height: imageSize.height, backgroundColor: theme.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }
                        ]}>
                          <ActivityIndicator size="small" color={theme.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Render file attachments */}
              {files.map((attachment, index) => (
                <TouchableOpacity
                  key={attachment.id || index}
                  style={[styles.attachmentItem, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={async () => {
                    if (attachment.file_url) {
                      console.log('📎 Downloading file:', attachment.file_url);
                      try {
                        // Get auth token
                        const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
                        if (!token) {
                          Alert.alert('Ошибка', 'Необходима авторизация для скачивания файла');
                          return;
                        }

                        // Fetch file with auth
                        const response = await fetch(attachment.file_url, {
                          headers: {
                            'Authorization': `Bearer ${token}`,
                          },
                        });

                        if (!response.ok) {
                          const errorText = await response.text();
                          console.error('❌ Server response:', response.status, errorText);
                          throw new Error(`Failed to download file: ${response.status} - ${errorText}`);
                        }

                        // Get blob and create download link
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = attachment.file_name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);

                        console.log('✅ File downloaded:', attachment.file_name);
                      } catch (error) {
                        console.error('❌ Failed to download file:', error);
                        Alert.alert('Ошибка', 'Не удалось скачать файл');
                      }
                    }
                  }}
                >
                  <Ionicons name="document-outline" size={24} color={theme.primary} />
                  <View style={styles.attachmentInfo}>
                    <Text style={[styles.attachmentName, { color: theme.text }]} numberOfLines={1}>
                      {decodeURIComponent(attachment.file_name)}
                    </Text>
                    <Text style={[styles.attachmentSize, { color: theme.textSecondary }]}>
                      {(attachment.file_size / 1024).toFixed(2)} KB
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}
      </View>
    )}

    <View style={styles.messageFooter}>
      <Text
        style={[
          styles.time,
          dynamicStyles.time,
          isOwnMessage && dynamicStyles.ownTime,
        ]}
      >
        {formatTime(message.created_at)}
      </Text>
      {message.is_edited && !message.is_deleted && (
        <Text
          style={[
            styles.edited,
            dynamicStyles.edited,
            isOwnMessage && dynamicStyles.ownEdited,
          ]}
        >
          изменено
        </Text>
      )}
      {renderMessageStatus()}
    </View>
  </View>
</TouchableOpacity>




      {/* Контекстное меню */}
      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <BlurView intensity={80} style={styles.blurOverlay} tint="dark">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowContextMenu(false)}
          >
            <View style={[
              styles.contextMenu,
              { backgroundColor: theme.backgroundSecondary, top: menuPosition.top, left: menuPosition.left }
            ]}>
            {/* Превью выбранного сообщения */}
            <View style={[styles.messagePreview, { backgroundColor: theme.background }]}>
              <Text style={[styles.previewText, { color: theme.text }]} numberOfLines={3}>
                {message.content}
              </Text>
              <Text style={[styles.previewTime, { color: theme.textSecondary }]}>
                {formatTime(message.created_at)}
              </Text>
            </View>

            {/* Разделитель */}
            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            {/* Ответить */}
            {onReply && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowContextMenu(false);
                  onReply(message);
                }}
              >
                <Ionicons name="arrow-undo-outline" size={20} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>Ответить</Text>
              </TouchableOpacity>
            )}

            {/* Скопировать */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowContextMenu(false);
                handleCopyMessage();
              }}
            >
              <Ionicons name="copy-outline" size={20} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>Скопировать</Text>
            </TouchableOpacity>

            {/* Изменить (только свои сообщения и не пересланные) */}
            {isOwnMessage && onEdit && !isForwardedMessage && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowContextMenu(false);
                  onEdit(message);
                }}
              >
                <Ionicons name="create-outline" size={20} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>Изменить</Text>
              </TouchableOpacity>
            )}

            {/* Закрепить / Открепить */}
            {message.is_pinned ? (
              onUnpin && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowContextMenu(false);
                    onUnpin(message.id);
                  }}
                >
                  <Ionicons name="pin" size={20} color={theme.text} />
                  <Text style={[styles.menuText, { color: theme.text }]}>Открепить</Text>
                </TouchableOpacity>
              )
            ) : (
              onPin && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowContextMenu(false);
                    onPin(message.id);
                  }}
                >
                  <Ionicons name="pin-outline" size={20} color={theme.text} />
                  <Text style={[styles.menuText, { color: theme.text }]}>Закрепить</Text>
                </TouchableOpacity>
              )
            )}

            {/* Переслать */}
            {onForward && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowContextMenu(false);
                  onForward(message);
                }}
              >
                <Ionicons name="arrow-redo-outline" size={20} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>Переслать</Text>
              </TouchableOpacity>
            )}

            {/* Удалить */}
            {onDelete && !isForwardedMessage && !message.is_deleted && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowContextMenu(false);
                  setShowDeleteModal(true);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#E94444" />
                <Text style={[styles.menuText, { color: '#E94444' }]}>Удалить</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
        </BlurView>
      </Modal>

      {/* Модальное окно удаления */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <BlurView intensity={80} style={styles.blurOverlay} tint="dark">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDeleteModal(false)}
          >
            <View style={[styles.deleteModal, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>
                Удалить сообщение?
              </Text>
              <Text style={[styles.deleteModalMessage, { color: theme.textSecondary }]}>
                {message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content}
              </Text>

              <View style={styles.deleteModalButtons}>
                {/* Удалить для всех - только если своё или админ */}
                {(isOwnMessage || isAdmin) && (
                  <TouchableOpacity
                    style={[styles.deleteModalButton, { backgroundColor: '#E94444' }]}
                    onPress={() => {
                      setShowDeleteModal(false);
                      onDelete?.(message.id, 'everyone');
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#FFF" />
                    <Text style={styles.deleteModalButtonText}>
                      Удалить для всех
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Удалить для меня - всегда доступно */}
                <TouchableOpacity
                  style={[styles.deleteModalButton, { backgroundColor: '#FF6B35' }]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    onDelete?.(message.id, 'me');
                  }}
                >
                  <Ionicons name="eye-off-outline" size={20} color="#FFF" />
                  <Text style={styles.deleteModalButtonText}>
                    Удалить для меня
                  </Text>
                </TouchableOpacity>

                {/* Отмена */}
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteModalCancelButton, { backgroundColor: theme.background }]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={[styles.deleteModalCancelText, { color: theme.text }]}>
                    Отмена
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </BlurView>
      </Modal>

      {/* Модальное окно профиля */}
      <UserProfileModal
        visible={showProfileModal}
        user={sender}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Полноэкранный просмотр изображения */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowImageViewer(false);
          setSelectedImage(null);
        }}
      >
        <BlurView intensity={95} style={styles.blurOverlay} tint="dark">
          <Pressable
            style={styles.imageViewerOverlay}
            onPress={() => {
              setShowImageViewer(false);
              setSelectedImage(null);
            }}
          >
            <View style={styles.imageViewerContainer}>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => {
                  setShowImageViewer(false);
                  setSelectedImage(null);
                }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </Pressable>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 16,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    marginLeft: 8,
    marginRight: 14,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  ownMessageBubble: {
    borderRadius: 16,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
 messageContentRow: {
  flexDirection: 'row',
  alignItems: 'flex-end', // выравнивание по нижнему краю
  justifyContent: 'space-between',
},

messageContent: {
  flexShrink: 1,
},

messageText: {
  fontSize: 15,
  lineHeight: 20,
  color: '#fff',
},

messageFooter: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  marginLeft: 6,
},

time: {
  fontSize: 11,
  color: '#ccc',
  transform: [{ translateY: 3 }], // 🔹 немного ниже базовой линии
},

edited: {
  fontSize: 11,
  marginLeft: 4,
  fontStyle: 'italic',
  color: '#aaa',
  transform: [{ translateY: 3 }], // 🔹 тоже чуть ниже
},

statusIcon: {
  marginLeft: 4,
  transform: [{ translateY: 5 }],
},

tail: {
  position: 'absolute',
  bottom: 0,
  left: -6, // немного вынос за пределы пузыря
  width: 12,
  height: 12,
  backgroundColor: '#fff', // заменяется динамически
  borderBottomRightRadius: 10,
  transform: [{ rotate: '45deg' }],
},

tailOwn: {
  position: 'absolute',
  bottom: 0,
  right: -6,
  width: 12,
  height: 12,
  backgroundColor: '#fff', // заменяется динамически
  borderBottomLeftRadius: 10,
  transform: [{ rotate: '-45deg' }],
},
replyContainer: {
  borderLeftWidth: 3,
  borderRadius: 8,
  paddingLeft: 8,
  paddingRight: 8,
  paddingVertical: 6,
  marginBottom: 8,
},
replySender: {
  fontSize: 13,
  fontWeight: '600',
  marginBottom: 2,
},
replyText: {
  fontSize: 13,
  lineHeight: 18,
},
highlightedBubble: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 6,
},
forwardedBubble: {
  borderLeftWidth: 4,
},

blurOverlay: {
  flex: 1,
},
modalOverlay: {
  flex: 1,
},
contextMenu: {
  position: 'absolute',
  minWidth: 250,
  maxWidth: Dimensions.get('window').width - 40,
  borderRadius: 12,
  padding: 0,
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 5,
},
messagePreview: {
  padding: 12,
  paddingBottom: 8,
},
previewText: {
  fontSize: 15,
  lineHeight: 20,
  marginBottom: 4,
},
previewTime: {
  fontSize: 11,
  marginTop: 4,
},
separator: {
  height: 1,
  marginHorizontal: 8,
  marginVertical: 4,
},
menuItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
},
menuText: {
  fontSize: 16,
  marginLeft: 12,
  fontWeight: '500',
},
deletedMessageContainer: {
  flexDirection: 'column',
  alignItems: 'flex-start',
},
deletedIcon: {
  marginBottom: 4,
},
deletedText: {
  fontSize: 14,
  fontStyle: 'italic',
  marginBottom: 8,
},
restoreButton: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
  marginTop: 4,
},
restoreButtonText: {
  color: '#FFF',
  fontSize: 13,
  fontWeight: '600',
},
deleteModal: {
  margin: 20,
  borderRadius: 16,
  padding: 20,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 5,
},
deleteModalTitle: {
  fontSize: 20,
  fontWeight: '700',
  marginBottom: 12,
  textAlign: 'center',
},
deleteModalMessage: {
  fontSize: 14,
  lineHeight: 20,
  marginBottom: 20,
  textAlign: 'center',
},
deleteModalButtons: {
  width: '100%',
  gap: 10,
},
deleteModalButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 14,
  paddingHorizontal: 20,
  borderRadius: 12,
  gap: 8,
},
deleteModalButtonText: {
  color: '#FFF',
  fontSize: 16,
  fontWeight: '600',
},
deleteModalCancelButton: {
  marginTop: 4,
},
deleteModalCancelText: {
  fontSize: 16,
  fontWeight: '600',
},
attachmentsContainer: {
  marginTop: 8,
  gap: 6,
},
imagesGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 4,
  marginBottom: 6,
},
imagesGridSingle: {
  // Single image - no special layout
},
imagesGridDouble: {
  // 2 images side by side
},
imagesGridMultiple: {
  // 3+ images in grid
},
attachmentItem: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 10,
  borderRadius: 8,
  gap: 10,
},
attachmentInfo: {
  flex: 1,
},
attachmentName: {
  fontSize: 14,
  fontWeight: '500',
  marginBottom: 2,
},
attachmentSize: {
  fontSize: 12,
},
imageAttachment: {
  borderRadius: 8,
  overflow: 'hidden',
},
imageAttachmentGrid: {
  // Additional styles for grid images
},
imagePreview: {
  borderRadius: 8,
},
imageViewerOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
imageViewerContainer: {
  width: '90%',
  height: '90%',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
},
fullscreenImage: {
  width: '100%',
  height: '100%',
},
closeButton: {
  position: 'absolute',
  top: 20,
  right: 20,
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
},

});

export default MessageItem;
