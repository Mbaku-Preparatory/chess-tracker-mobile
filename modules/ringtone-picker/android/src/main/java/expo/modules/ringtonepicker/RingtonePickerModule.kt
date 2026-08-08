package expo.modules.ringtonepicker

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Launches the Android system ringtone picker (the same dialog stock alarm/clock apps use) so a
 * notification sound can be selected without bundling any audio files into the app.
 */
class RingtonePickerContract : AppContextActivityResultContract<String, Uri?> {
  override fun createIntent(context: Context, input: String): Intent {
    val existing = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_NOTIFICATION)
    return Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
      putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_NOTIFICATION)
      putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
      putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
      putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, existing)
    }
  }

  override fun parseResult(input: String, resultCode: Int, intent: Intent?): Uri? {
    if (resultCode != Activity.RESULT_OK) return null
    return intent?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
  }
}

class RingtonePickerModule : Module() {
  private lateinit var pickerLauncher: AppContextActivityResultLauncher<String, Uri?>

  override fun definition() = ModuleDefinition {
    Name("RingtonePicker")

    AsyncFunction("pickRingtone") Coroutine { ->
      val uri = pickerLauncher.launch("")
        ?: return@Coroutine null

      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val title = try {
        RingtoneManager.getRingtone(context, uri)?.getTitle(context)
      } catch (e: Exception) {
        null
      }

      mapOf("uri" to uri.toString(), "title" to (title ?: "Custom sound"))
    }

    AsyncFunction("ensureNotificationChannel") { channelId: String, name: String, soundUri: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(channelId) == null) {
          val channel = NotificationChannel(channelId, name, NotificationManager.IMPORTANCE_HIGH)
          val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
          channel.setSound(Uri.parse(soundUri), audioAttributes)
          manager.createNotificationChannel(channel)
        }
      }
      null
    }

    RegisterActivityContracts {
      pickerLauncher = registerForActivityResult(RingtonePickerContract())
    }
  }
}
