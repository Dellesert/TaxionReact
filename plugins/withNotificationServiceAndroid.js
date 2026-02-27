const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const { withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to add a custom FirebaseMessagingService for Android
 * that displays sender avatars as notification large icons (Telegram-style).
 *
 * This plugin:
 * 1. Creates NotificationService.kt in the Android source directory
 * 2. Registers the service in AndroidManifest.xml
 */

const NOTIFICATION_SERVICE_KT = `package {{PACKAGE_NAME}}

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class NotificationService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "NotificationService"
        private const val AVATAR_SIZE = 256
        private const val DOWNLOAD_TIMEOUT_MS = 5000
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "Message received from: \${remoteMessage.from}")

        val data = remoteMessage.data
        if (data.isEmpty()) {
            super.onMessageReceived(remoteMessage)
            return
        }

        val title = data["title"] ?: remoteMessage.notification?.title ?: return
        val body = data["body"] ?: remoteMessage.notification?.body ?: ""
        val senderAvatar = data["sender_avatar"]
        val channelId = data["channel_id"] ?: "messages"
        val sound = data["sound"]
        val type = data["type"] ?: ""
        val notificationId = data["notification_id"]?.toIntOrNull()
            ?: System.currentTimeMillis().toInt()

        // Download avatar in background, then show notification
        if (!senderAvatar.isNullOrEmpty()) {
            thread {
                val avatarBitmap = downloadAndCropCircle(senderAvatar)
                showNotification(title, body, channelId, sound, type, data, notificationId, avatarBitmap)
            }
        } else {
            showNotification(title, body, channelId, sound, type, data, notificationId, null)
        }
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "New FCM token: \${token.take(10)}...")
        // Token is managed by Expo/React Native Firebase via getDevicePushTokenAsync()
    }

    private fun showNotification(
        title: String,
        body: String,
        channelId: String,
        sound: String?,
        type: String,
        data: Map<String, String>,
        notificationId: Int,
        avatarBitmap: Bitmap?
    ) {
        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Ensure notification channel exists
        ensureChannel(notificationManager, channelId)

        // Build deep link for notification tap
        val deepLinkUri = buildDeepLink(type, data)
        val intent = Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
            setPackage(packageName)
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Build the notification
        val soundUri = when {
            sound == "default" || sound.isNullOrEmpty() ->
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            else ->
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        }

        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.notification_icon)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setContentIntent(pendingIntent)
            .setPriority(getNotificationPriority(channelId))
            .setColor(0xFFE94444.toInt()) // App brand color

        // Set avatar as large icon if available
        if (avatarBitmap != null) {
            builder.setLargeIcon(avatarBitmap)
        }

        // Use BigTextStyle for longer messages
        if (body.length > 40) {
            builder.setStyle(NotificationCompat.BigTextStyle().bigText(body))
        }

        notificationManager.notify(notificationId, builder.build())
    }

    private fun buildDeepLink(type: String, data: Map<String, String>): Uri {
        // Build deep links matching React Navigation's linking config:
        // tachyon://chat/{chatId}, tachyon://task/{taskId}, tachyon://event/{eventId}, etc.
        return when (type) {
            "message", "mention", "reaction" -> {
                val chatId = data["chat_id"] ?: return Uri.parse("tachyon://chats")
                Uri.parse("tachyon://chat/\$chatId")
            }
            "task" -> {
                val taskId = data["task_id"] ?: return Uri.parse("tachyon://tasks")
                Uri.parse("tachyon://task/\$taskId")
            }
            "calendar", "event" -> {
                val eventId = data["event_id"] ?: return Uri.parse("tachyon://calendar")
                Uri.parse("tachyon://event/\$eventId")
            }
            "poll" -> {
                val pollId = data["poll_id"] ?: return Uri.parse("tachyon://polls")
                Uri.parse("tachyon://poll/\$pollId")
            }
            "reminder" -> {
                when {
                    data.containsKey("event_id") ->
                        Uri.parse("tachyon://event/\${data["event_id"]}")
                    data.containsKey("task_id") ->
                        Uri.parse("tachyon://task/\${data["task_id"]}")
                    else -> Uri.parse("tachyon://home")
                }
            }
            else -> Uri.parse("tachyon://home")
        }
    }

    private fun downloadAndCropCircle(url: String): Bitmap? {
        return try {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.connectTimeout = DOWNLOAD_TIMEOUT_MS
            connection.readTimeout = DOWNLOAD_TIMEOUT_MS
            connection.doInput = true
            connection.connect()

            val inputStream = connection.inputStream
            val originalBitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            connection.disconnect()

            originalBitmap?.let { cropToCircle(it) }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to download avatar: \${e.message}")
            null
        }
    }

    private fun cropToCircle(bitmap: Bitmap): Bitmap {
        val size = minOf(bitmap.width, bitmap.height, AVATAR_SIZE)
        val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint().apply {
            isAntiAlias = true
        }
        val rect = Rect(0, 0, size, size)
        val rectF = RectF(rect)

        canvas.drawOval(rectF, paint)
        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)

        // Scale and center-crop the bitmap
        val scaledBitmap = Bitmap.createScaledBitmap(bitmap, size, size, true)
        canvas.drawBitmap(scaledBitmap, 0f, 0f, paint)

        if (scaledBitmap !== bitmap) {
            scaledBitmap.recycle()
        }
        bitmap.recycle()

        return output
    }

    private fun ensureChannel(manager: NotificationManager, channelId: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        if (manager.getNotificationChannel(channelId) != null) return

        val (name, importance) = when (channelId) {
            "messages" -> "Messages" to NotificationManager.IMPORTANCE_HIGH
            "tasks" -> "Tasks" to NotificationManager.IMPORTANCE_DEFAULT
            "calendar" -> "Calendar" to NotificationManager.IMPORTANCE_HIGH
            "mentions" -> "Mentions" to NotificationManager.IMPORTANCE_HIGH
            "reminders" -> "Reminders" to NotificationManager.IMPORTANCE_HIGH
            "polls" -> "Polls" to NotificationManager.IMPORTANCE_DEFAULT
            "system" -> "System" to NotificationManager.IMPORTANCE_DEFAULT
            "announcements" -> "Announcements" to NotificationManager.IMPORTANCE_DEFAULT
            else -> "Default" to NotificationManager.IMPORTANCE_DEFAULT
        }

        val channel = NotificationChannel(channelId, name, importance).apply {
            enableVibration(true)
            if (importance == NotificationManager.IMPORTANCE_HIGH) {
                enableLights(true)
            }
        }
        manager.createNotificationChannel(channel)
    }

    private fun getNotificationPriority(channelId: String): Int {
        return when (channelId) {
            "messages", "calendar", "mentions", "reminders" ->
                NotificationCompat.PRIORITY_HIGH
            else ->
                NotificationCompat.PRIORITY_DEFAULT
        }
    }
}
`;

/**
 * Write NotificationService.kt to the Android source directory
 */
const withNotificationServiceFile = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android?.package || 'com.dellesert.tachyonmessenger';
      const packagePath = packageName.replace(/\./g, '/');
      const srcDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', packagePath
      );

      // Ensure directory exists
      fs.mkdirSync(srcDir, { recursive: true });

      const filePath = path.join(srcDir, 'NotificationService.kt');
      const content = NOTIFICATION_SERVICE_KT.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);

      fs.writeFileSync(filePath, content);
      console.log('✅ [Android] Created NotificationService.kt for push notification avatars');

      return config;
    },
  ]);
};

/**
 * Register the NotificationService in AndroidManifest.xml
 */
const withNotificationServiceManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];

    if (!application) {
      console.warn('⚠️  [Android] No application element found in AndroidManifest.xml');
      return config;
    }

    // Ensure service array exists
    if (!application.service) {
      application.service = [];
    }

    // Check if our service is already registered
    const existingService = application.service.find(
      (s) => s.$['android:name'] === '.NotificationService'
    );

    if (!existingService) {
      application.service.push({
        $: {
          'android:name': '.NotificationService',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'com.google.firebase.MESSAGING_EVENT',
                },
              },
            ],
          },
        ],
      });
      console.log('✅ [Android] Registered NotificationService in AndroidManifest.xml');
    } else {
      console.log('ℹ️  [Android] NotificationService already registered in AndroidManifest.xml');
    }

    return config;
  });
};

/**
 * Combined plugin: writes the Kotlin file and updates the manifest
 */
const withNotificationServiceAndroid = (config) => {
  return withPlugins(config, [
    withNotificationServiceFile,
    withNotificationServiceManifest,
  ]);
};

module.exports = withNotificationServiceAndroid;
