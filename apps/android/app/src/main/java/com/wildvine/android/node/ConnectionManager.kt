package com.wildvine.android.node

import android.os.Build
import com.wildvine.android.BuildConfig
import com.wildvine.android.SecurePrefs
import com.wildvine.android.gateway.GatewayClientInfo
import com.wildvine.android.gateway.GatewayConnectOptions
import com.wildvine.android.gateway.GatewayEndpoint
import com.wildvine.android.gateway.GatewayTlsParams
import com.wildvine.android.protocol.WildvineCanvasA2UICommand
import com.wildvine.android.protocol.WildvineCanvasCommand
import com.wildvine.android.protocol.WildvineCameraCommand
import com.wildvine.android.protocol.WildvineLocationCommand
import com.wildvine.android.protocol.WildvineScreenCommand
import com.wildvine.android.protocol.WildvineSmsCommand
import com.wildvine.android.protocol.WildvineCapability
import com.wildvine.android.LocationMode
import com.wildvine.android.VoiceWakeMode

class ConnectionManager(
  private val prefs: SecurePrefs,
  private val cameraEnabled: () -> Boolean,
  private val locationMode: () -> LocationMode,
  private val voiceWakeMode: () -> VoiceWakeMode,
  private val smsAvailable: () -> Boolean,
  private val hasRecordAudioPermission: () -> Boolean,
  private val manualTls: () -> Boolean,
) {
  companion object {
    internal fun resolveTlsParamsForEndpoint(
      endpoint: GatewayEndpoint,
      storedFingerprint: String?,
      manualTlsEnabled: Boolean,
    ): GatewayTlsParams? {
      val stableId = endpoint.stableId
      val stored = storedFingerprint?.trim().takeIf { !it.isNullOrEmpty() }
      val isManual = stableId.startsWith("manual|")

      if (isManual) {
        if (!manualTlsEnabled) return null
        if (!stored.isNullOrBlank()) {
          return GatewayTlsParams(
            required = true,
            expectedFingerprint = stored,
            allowTOFU = false,
            stableId = stableId,
          )
        }
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      // Prefer stored pins. Never let discovery-provided TXT override a stored fingerprint.
      if (!stored.isNullOrBlank()) {
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = stored,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      val hinted = endpoint.tlsEnabled || !endpoint.tlsFingerprintSha256.isNullOrBlank()
      if (hinted) {
        // TXT is unauthenticated. Do not treat the advertised fingerprint as authoritative.
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      return null
    }
  }

  fun buildInvokeCommands(): List<String> =
    buildList {
      add(WildvineCanvasCommand.Present.rawValue)
      add(WildvineCanvasCommand.Hide.rawValue)
      add(WildvineCanvasCommand.Navigate.rawValue)
      add(WildvineCanvasCommand.Eval.rawValue)
      add(WildvineCanvasCommand.Snapshot.rawValue)
      add(WildvineCanvasA2UICommand.Push.rawValue)
      add(WildvineCanvasA2UICommand.PushJSONL.rawValue)
      add(WildvineCanvasA2UICommand.Reset.rawValue)
      add(WildvineScreenCommand.Record.rawValue)
      if (cameraEnabled()) {
        add(WildvineCameraCommand.Snap.rawValue)
        add(WildvineCameraCommand.Clip.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(WildvineLocationCommand.Get.rawValue)
      }
      if (smsAvailable()) {
        add(WildvineSmsCommand.Send.rawValue)
      }
      if (BuildConfig.DEBUG) {
        add("debug.logs")
        add("debug.ed25519")
      }
      add("app.update")
    }

  fun buildCapabilities(): List<String> =
    buildList {
      add(WildvineCapability.Canvas.rawValue)
      add(WildvineCapability.Screen.rawValue)
      if (cameraEnabled()) add(WildvineCapability.Camera.rawValue)
      if (smsAvailable()) add(WildvineCapability.Sms.rawValue)
      if (voiceWakeMode() != VoiceWakeMode.Off && hasRecordAudioPermission()) {
        add(WildvineCapability.VoiceWake.rawValue)
      }
      if (locationMode() != LocationMode.Off) {
        add(WildvineCapability.Location.rawValue)
      }
    }

  fun resolvedVersionName(): String {
    val versionName = BuildConfig.VERSION_NAME.trim().ifEmpty { "dev" }
    return if (BuildConfig.DEBUG && !versionName.contains("dev", ignoreCase = true)) {
      "$versionName-dev"
    } else {
      versionName
    }
  }

  fun resolveModelIdentifier(): String? {
    return listOfNotNull(Build.MANUFACTURER, Build.MODEL)
      .joinToString(" ")
      .trim()
      .ifEmpty { null }
  }

  fun buildUserAgent(): String {
    val version = resolvedVersionName()
    val release = Build.VERSION.RELEASE?.trim().orEmpty()
    val releaseLabel = if (release.isEmpty()) "unknown" else release
    return "WildvineAndroid/$version (Android $releaseLabel; SDK ${Build.VERSION.SDK_INT})"
  }

  fun buildClientInfo(clientId: String, clientMode: String): GatewayClientInfo {
    return GatewayClientInfo(
      id = clientId,
      displayName = prefs.displayName.value,
      version = resolvedVersionName(),
      platform = "android",
      mode = clientMode,
      instanceId = prefs.instanceId.value,
      deviceFamily = "Android",
      modelIdentifier = resolveModelIdentifier(),
    )
  }

  fun buildNodeConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "node",
      scopes = emptyList(),
      caps = buildCapabilities(),
      commands = buildInvokeCommands(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "wildvine-android", clientMode = "node"),
      userAgent = buildUserAgent(),
    )
  }

  fun buildOperatorConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "operator",
      scopes = listOf("operator.read", "operator.write", "operator.talk.secrets"),
      caps = emptyList(),
      commands = emptyList(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "wildvine-control-ui", clientMode = "ui"),
      userAgent = buildUserAgent(),
    )
  }

  fun resolveTlsParams(endpoint: GatewayEndpoint): GatewayTlsParams? {
    val stored = prefs.loadGatewayTlsFingerprint(endpoint.stableId)
    return resolveTlsParamsForEndpoint(endpoint, storedFingerprint = stored, manualTlsEnabled = manualTls())
  }
}
