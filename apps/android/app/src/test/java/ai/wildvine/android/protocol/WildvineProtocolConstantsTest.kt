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
    assertEquals("screen", WildvineCapability.Screen.rawValue)
    assertEquals("voiceWake", WildvineCapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", WildvineScreenCommand.Record.rawValue)
  }
}
