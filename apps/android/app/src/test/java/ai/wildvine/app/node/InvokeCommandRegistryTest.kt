package com.wildvine.android.node

import com.wildvine.android.protocol.WildvineCalendarCommand
import com.wildvine.android.protocol.WildvineCameraCommand
import com.wildvine.android.protocol.WildvineCallLogCommand
import com.wildvine.android.protocol.WildvineCapability
import com.wildvine.android.protocol.WildvineContactsCommand
import com.wildvine.android.protocol.WildvineDeviceCommand
import com.wildvine.android.protocol.WildvineLocationCommand
import com.wildvine.android.protocol.WildvineMotionCommand
import com.wildvine.android.protocol.WildvineNotificationsCommand
import com.wildvine.android.protocol.WildvinePhotosCommand
import com.wildvine.android.protocol.WildvineSmsCommand
import com.wildvine.android.protocol.WildvineSystemCommand
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InvokeCommandRegistryTest {
  private val coreCapabilities =
    setOf(
      WildvineCapability.Canvas.rawValue,
      WildvineCapability.Device.rawValue,
      WildvineCapability.Notifications.rawValue,
      WildvineCapability.System.rawValue,
      WildvineCapability.Photos.rawValue,
      WildvineCapability.Contacts.rawValue,
      WildvineCapability.Calendar.rawValue,
    )

  private val optionalCapabilities =
    setOf(
      WildvineCapability.Camera.rawValue,
      WildvineCapability.Location.rawValue,
      WildvineCapability.Sms.rawValue,
      WildvineCapability.CallLog.rawValue,
      WildvineCapability.VoiceWake.rawValue,
      WildvineCapability.Motion.rawValue,
    )

  private val coreCommands =
    setOf(
      WildvineDeviceCommand.Status.rawValue,
      WildvineDeviceCommand.Info.rawValue,
      WildvineDeviceCommand.Permissions.rawValue,
      WildvineDeviceCommand.Health.rawValue,
      WildvineNotificationsCommand.List.rawValue,
      WildvineNotificationsCommand.Actions.rawValue,
      WildvineSystemCommand.Notify.rawValue,
      WildvinePhotosCommand.Latest.rawValue,
      WildvineContactsCommand.Search.rawValue,
      WildvineContactsCommand.Add.rawValue,
      WildvineCalendarCommand.Events.rawValue,
      WildvineCalendarCommand.Add.rawValue,
    )

  private val optionalCommands =
    setOf(
      WildvineCameraCommand.Snap.rawValue,
      WildvineCameraCommand.Clip.rawValue,
      WildvineCameraCommand.List.rawValue,
      WildvineLocationCommand.Get.rawValue,
      WildvineMotionCommand.Activity.rawValue,
      WildvineMotionCommand.Pedometer.rawValue,
      WildvineSmsCommand.Send.rawValue,
      WildvineSmsCommand.Search.rawValue,
      WildvineCallLogCommand.Search.rawValue,
    )

  private val debugCommands = setOf("debug.logs", "debug.ed25519")

  @Test
  fun advertisedCapabilities_respectsFeatureAvailability() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags())

    assertContainsAll(capabilities, coreCapabilities)
    assertMissingAll(capabilities, optionalCapabilities)
  }

  @Test
  fun advertisedCapabilities_includesFeatureCapabilitiesWhenEnabled() {
    val capabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          voiceWakeEnabled = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
        ),
      )

    assertContainsAll(capabilities, coreCapabilities + optionalCapabilities)
  }

  @Test
  fun advertisedCommands_respectsFeatureAvailability() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags())

    assertContainsAll(commands, coreCommands)
    assertMissingAll(commands, optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_includesFeatureCommandsWhenEnabled() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(
          cameraEnabled = true,
          locationEnabled = true,
          sendSmsAvailable = true,
          readSmsAvailable = true,
          smsSearchPossible = true,
          callLogAvailable = true,
          motionActivityAvailable = true,
          motionPedometerAvailable = true,
          debugBuild = true,
        ),
      )

    assertContainsAll(commands, coreCommands + optionalCommands + debugCommands)
  }

  @Test
  fun advertisedCommands_onlyIncludesSupportedMotionCommands() {
    val commands =
      InvokeCommandRegistry.advertisedCommands(
        NodeRuntimeFlags(
          cameraEnabled = false,
          locationEnabled = false,
          sendSmsAvailable = false,
          readSmsAvailable = false,
          smsSearchPossible = false,
          callLogAvailable = false,
          voiceWakeEnabled = false,
          motionActivityAvailable = true,
          motionPedometerAvailable = false,
          debugBuild = false,
        ),
      )

    assertTrue(commands.contains(WildvineMotionCommand.Activity.rawValue))
    assertFalse(commands.contains(WildvineMotionCommand.Pedometer.rawValue))
  }

  @Test
  fun advertisedCommands_splitsSmsSendAndSearchAvailability() {
    val readOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(readSmsAvailable = true, smsSearchPossible = true),
      )
    val sendOnlyCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCommands =
      InvokeCommandRegistry.advertisedCommands(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCommands.contains(WildvineSmsCommand.Search.rawValue))
    assertFalse(readOnlyCommands.contains(WildvineSmsCommand.Send.rawValue))
    assertTrue(sendOnlyCommands.contains(WildvineSmsCommand.Send.rawValue))
    assertFalse(sendOnlyCommands.contains(WildvineSmsCommand.Search.rawValue))
    assertTrue(requestableSearchCommands.contains(WildvineSmsCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_includeSmsWhenEitherSmsPathIsAvailable() {
    val readOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(readSmsAvailable = true),
      )
    val sendOnlyCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(sendSmsAvailable = true),
      )
    val requestableSearchCapabilities =
      InvokeCommandRegistry.advertisedCapabilities(
        defaultFlags(smsSearchPossible = true),
      )

    assertTrue(readOnlyCapabilities.contains(WildvineCapability.Sms.rawValue))
    assertTrue(sendOnlyCapabilities.contains(WildvineCapability.Sms.rawValue))
    assertFalse(requestableSearchCapabilities.contains(WildvineCapability.Sms.rawValue))
  }

  @Test
  fun advertisedCommands_excludesCallLogWhenUnavailable() {
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(callLogAvailable = false))

    assertFalse(commands.contains(WildvineCallLogCommand.Search.rawValue))
  }

  @Test
  fun advertisedCapabilities_excludesCallLogWhenUnavailable() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(callLogAvailable = false))

    assertFalse(capabilities.contains(WildvineCapability.CallLog.rawValue))
  }

  @Test
  fun advertisedCapabilities_includesVoiceWakeWithoutAdvertisingCommands() {
    val capabilities = InvokeCommandRegistry.advertisedCapabilities(defaultFlags(voiceWakeEnabled = true))
    val commands = InvokeCommandRegistry.advertisedCommands(defaultFlags(voiceWakeEnabled = true))

    assertTrue(capabilities.contains(WildvineCapability.VoiceWake.rawValue))
    assertFalse(commands.any { it.contains("voice", ignoreCase = true) })
  }

  @Test
  fun find_returnsForegroundMetadataForCameraCommands() {
    val list = InvokeCommandRegistry.find(WildvineCameraCommand.List.rawValue)
    val location = InvokeCommandRegistry.find(WildvineLocationCommand.Get.rawValue)

    assertNotNull(list)
    assertEquals(true, list?.requiresForeground)
    assertNotNull(location)
    assertEquals(false, location?.requiresForeground)
  }

  @Test
  fun find_returnsNullForUnknownCommand() {
    assertNull(InvokeCommandRegistry.find("not.real"))
  }

  private fun defaultFlags(
    cameraEnabled: Boolean = false,
    locationEnabled: Boolean = false,
    sendSmsAvailable: Boolean = false,
    readSmsAvailable: Boolean = false,
    smsSearchPossible: Boolean = false,
    callLogAvailable: Boolean = false,
    voiceWakeEnabled: Boolean = false,
    motionActivityAvailable: Boolean = false,
    motionPedometerAvailable: Boolean = false,
    debugBuild: Boolean = false,
  ): NodeRuntimeFlags =
    NodeRuntimeFlags(
      cameraEnabled = cameraEnabled,
      locationEnabled = locationEnabled,
      sendSmsAvailable = sendSmsAvailable,
      readSmsAvailable = readSmsAvailable,
      smsSearchPossible = smsSearchPossible,
      callLogAvailable = callLogAvailable,
      voiceWakeEnabled = voiceWakeEnabled,
      motionActivityAvailable = motionActivityAvailable,
      motionPedometerAvailable = motionPedometerAvailable,
      debugBuild = debugBuild,
    )

  private fun assertContainsAll(actual: List<String>, expected: Set<String>) {
    expected.forEach { value -> assertTrue(actual.contains(value)) }
  }

  private fun assertMissingAll(actual: List<String>, forbidden: Set<String>) {
    forbidden.forEach { value -> assertFalse(actual.contains(value)) }
  }
}
