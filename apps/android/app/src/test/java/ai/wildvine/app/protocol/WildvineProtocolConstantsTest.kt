package com.wildvine.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class WildvineProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", WildvineCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", WildvineCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", WildvineCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", WildvineCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", WildvineCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", WildvineCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", WildvineCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", WildvineCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", WildvineCapability.Canvas.rawValue)
    assertEquals("camera", WildvineCapability.Camera.rawValue)
    assertEquals("voiceWake", WildvineCapability.VoiceWake.rawValue)
    assertEquals("location", WildvineCapability.Location.rawValue)
    assertEquals("sms", WildvineCapability.Sms.rawValue)
    assertEquals("device", WildvineCapability.Device.rawValue)
    assertEquals("notifications", WildvineCapability.Notifications.rawValue)
    assertEquals("system", WildvineCapability.System.rawValue)
    assertEquals("photos", WildvineCapability.Photos.rawValue)
    assertEquals("contacts", WildvineCapability.Contacts.rawValue)
    assertEquals("calendar", WildvineCapability.Calendar.rawValue)
    assertEquals("motion", WildvineCapability.Motion.rawValue)
    assertEquals("callLog", WildvineCapability.CallLog.rawValue)
  }

  @Test
  fun cameraCommandsUseStableStrings() {
    assertEquals("camera.list", WildvineCameraCommand.List.rawValue)
    assertEquals("camera.snap", WildvineCameraCommand.Snap.rawValue)
    assertEquals("camera.clip", WildvineCameraCommand.Clip.rawValue)
  }

  @Test
  fun notificationsCommandsUseStableStrings() {
    assertEquals("notifications.list", WildvineNotificationsCommand.List.rawValue)
    assertEquals("notifications.actions", WildvineNotificationsCommand.Actions.rawValue)
  }

  @Test
  fun deviceCommandsUseStableStrings() {
    assertEquals("device.status", WildvineDeviceCommand.Status.rawValue)
    assertEquals("device.info", WildvineDeviceCommand.Info.rawValue)
    assertEquals("device.permissions", WildvineDeviceCommand.Permissions.rawValue)
    assertEquals("device.health", WildvineDeviceCommand.Health.rawValue)
  }

  @Test
  fun systemCommandsUseStableStrings() {
    assertEquals("system.notify", WildvineSystemCommand.Notify.rawValue)
  }

  @Test
  fun photosCommandsUseStableStrings() {
    assertEquals("photos.latest", WildvinePhotosCommand.Latest.rawValue)
  }

  @Test
  fun contactsCommandsUseStableStrings() {
    assertEquals("contacts.search", WildvineContactsCommand.Search.rawValue)
    assertEquals("contacts.add", WildvineContactsCommand.Add.rawValue)
  }

  @Test
  fun calendarCommandsUseStableStrings() {
    assertEquals("calendar.events", WildvineCalendarCommand.Events.rawValue)
    assertEquals("calendar.add", WildvineCalendarCommand.Add.rawValue)
  }

  @Test
  fun motionCommandsUseStableStrings() {
    assertEquals("motion.activity", WildvineMotionCommand.Activity.rawValue)
    assertEquals("motion.pedometer", WildvineMotionCommand.Pedometer.rawValue)
  }

  @Test
  fun smsCommandsUseStableStrings() {
    assertEquals("sms.send", WildvineSmsCommand.Send.rawValue)
    assertEquals("sms.search", WildvineSmsCommand.Search.rawValue)
  }

  @Test
  fun callLogCommandsUseStableStrings() {
    assertEquals("callLog.search", WildvineCallLogCommand.Search.rawValue)
  }

}
