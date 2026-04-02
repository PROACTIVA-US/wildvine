package com.wildvine.android.node

import com.wildvine.android.LocationMode
import com.wildvine.android.SecurePrefs
import com.wildvine.android.VoiceWakeMode
import com.wildvine.android.protocol.WildvineCallLogCommand
import com.wildvine.android.protocol.WildvineCameraCommand
import com.wildvine.android.protocol.WildvineCapability
import com.wildvine.android.protocol.WildvineLocationCommand
import com.wildvine.android.protocol.WildvineMotionCommand
import com.wildvine.android.protocol.WildvineSmsCommand
import com.wildvine.android.gateway.GatewayEndpoint
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class ConnectionManagerTest {
  @Test
  fun resolveTlsParamsForEndpoint_prefersStoredPinOverAdvertisedFingerprint() {
    val endpoint =
      GatewayEndpoint(
        stableId = "_wildvine-gw._tcp.|local.|Test",
        name = "Test",
        host = "10.0.0.2",
        port = 18789,
        tlsEnabled = true,
        tlsFingerprintSha256 = "attacker",
      )

    val params =
      ConnectionManager.resolveTlsParamsForEndpoint(
        endpoint,
        storedFingerprint = "legit",
        manualTlsEnabled = false,
      )

    assertEquals("legit", params?.expectedFingerprint)
    assertEquals(false, params?.allowTOFU)
  }

  @Test
  fun resolveTlsParamsForEndpoint_doesNotTrustAdvertisedFingerprintWhenNoStoredPin() {
    val endpoint =
      GatewayEndpoint(
        stableId = "_wildvine-gw._tcp.|local.|Test",
        name = "Test",
        host = "10.0.0.2",
        port = 18789,
        tlsEnabled = true,
        tlsFingerprintSha256 = "attacker",
      )

    val params =
      ConnectionManager.resolveTlsParamsForEndpoint(
        endpoint,
        storedFingerprint = null,
        manualTlsEnabled = false,
      )

    assertNull(params?.expectedFingerprint)
    assertEquals(false, params?.allowTOFU)
  }

  @Test
  fun resolveTlsParamsForEndpoint_manualRespectsManualTlsToggle() {
    val endpoint = GatewayEndpoint.manual(host = "example.com", port = 443)

    val off =
      ConnectionManager.resolveTlsParamsForEndpoint(
        endpoint,
        storedFingerprint = null,
        manualTlsEnabled = false,
      )
    assertNull(off)

    val on =
      ConnectionManager.resolveTlsParamsForEndpoint(
        endpoint,
        storedFingerprint = null,
        manualTlsEnabled = true,
      )
    assertNull(on?.expectedFingerprint)
    assertEquals(false, on?.allowTOFU)
  }

  @Test
  fun buildNodeConnectOptions_advertisesRequestableSmsSearchWithoutSmsCapability() {
    val options =
      newManager(
        sendSmsAvailable = false,
        readSmsAvailable = false,
        smsSearchPossible = true,
      ).buildNodeConnectOptions()

    assertTrue(options.commands.contains(WildvineSmsCommand.Search.rawValue))
    assertFalse(options.commands.contains(WildvineSmsCommand.Send.rawValue))
    assertFalse(options.caps.contains(WildvineCapability.Sms.rawValue))
  }

  @Test
  fun buildNodeConnectOptions_doesNotAdvertiseSmsWhenSearchIsImpossible() {
    val options =
      newManager(
        sendSmsAvailable = false,
        readSmsAvailable = false,
        smsSearchPossible = false,
      ).buildNodeConnectOptions()

    assertFalse(options.commands.contains(WildvineSmsCommand.Search.rawValue))
    assertFalse(options.commands.contains(WildvineSmsCommand.Send.rawValue))
    assertFalse(options.caps.contains(WildvineCapability.Sms.rawValue))
  }

  @Test
  fun buildNodeConnectOptions_advertisesSmsCapabilityWhenReadSmsIsAvailable() {
    val options =
      newManager(
        sendSmsAvailable = false,
        readSmsAvailable = true,
        smsSearchPossible = true,
      ).buildNodeConnectOptions()

    assertTrue(options.commands.contains(WildvineSmsCommand.Search.rawValue))
    assertTrue(options.caps.contains(WildvineCapability.Sms.rawValue))
  }

  @Test
  fun buildNodeConnectOptions_advertisesSmsSendWithoutSearchWhenOnlySendIsAvailable() {
    val options =
      newManager(
        sendSmsAvailable = true,
        readSmsAvailable = false,
        smsSearchPossible = false,
      ).buildNodeConnectOptions()

    assertTrue(options.commands.contains(WildvineSmsCommand.Send.rawValue))
    assertFalse(options.commands.contains(WildvineSmsCommand.Search.rawValue))
    assertTrue(options.caps.contains(WildvineCapability.Sms.rawValue))
  }

  @Test
  fun buildNodeConnectOptions_advertisesAvailableNonSmsCommandsAndCapabilities() {
    val options =
      newManager(
        cameraEnabled = true,
        locationMode = LocationMode.WhileUsing,
        voiceWakeMode = VoiceWakeMode.Always,
        motionActivityAvailable = true,
        callLogAvailable = true,
        hasRecordAudioPermission = true,
      ).buildNodeConnectOptions()

    assertTrue(options.commands.contains(WildvineCameraCommand.List.rawValue))
    assertTrue(options.commands.contains(WildvineLocationCommand.Get.rawValue))
    assertTrue(options.commands.contains(WildvineMotionCommand.Activity.rawValue))
    assertTrue(options.commands.contains(WildvineCallLogCommand.Search.rawValue))
    assertTrue(options.caps.contains(WildvineCapability.Camera.rawValue))
    assertTrue(options.caps.contains(WildvineCapability.Location.rawValue))
    assertTrue(options.caps.contains(WildvineCapability.Motion.rawValue))
    assertTrue(options.caps.contains(WildvineCapability.CallLog.rawValue))
    assertTrue(options.caps.contains(WildvineCapability.VoiceWake.rawValue))
  }

  @Test
  fun buildNodeConnectOptions_omitsVoiceWakeWithoutMicrophonePermission() {
    val options =
      newManager(
        voiceWakeMode = VoiceWakeMode.Always,
        hasRecordAudioPermission = false,
      ).buildNodeConnectOptions()

    assertFalse(options.caps.contains(WildvineCapability.VoiceWake.rawValue))
  }

  @Test
  fun buildNodeConnectOptions_omitsUnavailableCameraLocationAndCallLogSurfaces() {
    val options =
      newManager(
        cameraEnabled = false,
        locationMode = LocationMode.Off,
        callLogAvailable = false,
      ).buildNodeConnectOptions()

    assertFalse(options.commands.contains(WildvineCameraCommand.List.rawValue))
    assertFalse(options.commands.contains(WildvineCameraCommand.Snap.rawValue))
    assertFalse(options.commands.contains(WildvineCameraCommand.Clip.rawValue))
    assertFalse(options.commands.contains(WildvineLocationCommand.Get.rawValue))
    assertFalse(options.commands.contains(WildvineCallLogCommand.Search.rawValue))
    assertFalse(options.caps.contains(WildvineCapability.Camera.rawValue))
    assertFalse(options.caps.contains(WildvineCapability.Location.rawValue))
    assertFalse(options.caps.contains(WildvineCapability.CallLog.rawValue))
  }

  @Test
  fun buildNodeConnectOptions_advertisesOnlyAvailableMotionCommand() {
    val options =
      newManager(
        motionActivityAvailable = false,
        motionPedometerAvailable = true,
      ).buildNodeConnectOptions()

    assertFalse(options.commands.contains(WildvineMotionCommand.Activity.rawValue))
    assertTrue(options.commands.contains(WildvineMotionCommand.Pedometer.rawValue))
    assertTrue(options.caps.contains(WildvineCapability.Motion.rawValue))
  }

  @Test
  fun buildNodeConnectOptions_omitsMotionSurfaceWhenMotionApisUnavailable() {
    val options =
      newManager(
        motionActivityAvailable = false,
        motionPedometerAvailable = false,
      ).buildNodeConnectOptions()

    assertFalse(options.commands.contains(WildvineMotionCommand.Activity.rawValue))
    assertFalse(options.commands.contains(WildvineMotionCommand.Pedometer.rawValue))
    assertFalse(options.caps.contains(WildvineCapability.Motion.rawValue))
  }

  private fun newManager(
    cameraEnabled: Boolean = false,
    locationMode: LocationMode = LocationMode.Off,
    voiceWakeMode: VoiceWakeMode = VoiceWakeMode.Off,
    motionActivityAvailable: Boolean = false,
    motionPedometerAvailable: Boolean = false,
    sendSmsAvailable: Boolean = false,
    readSmsAvailable: Boolean = false,
    smsSearchPossible: Boolean = false,
    callLogAvailable: Boolean = false,
    hasRecordAudioPermission: Boolean = false,
  ): ConnectionManager {
    val context = RuntimeEnvironment.getApplication()
    val prefs =
      SecurePrefs(
        context,
        securePrefsOverride = context.getSharedPreferences("connection-manager-test", android.content.Context.MODE_PRIVATE),
      )

    return ConnectionManager(
      prefs = prefs,
      cameraEnabled = { cameraEnabled },
      locationMode = { locationMode },
      voiceWakeMode = { voiceWakeMode },
      motionActivityAvailable = { motionActivityAvailable },
      motionPedometerAvailable = { motionPedometerAvailable },
      sendSmsAvailable = { sendSmsAvailable },
      readSmsAvailable = { readSmsAvailable },
      smsSearchPossible = { smsSearchPossible },
      callLogAvailable = { callLogAvailable },
      hasRecordAudioPermission = { hasRecordAudioPermission },
      manualTls = { false },
    )
  }
}
