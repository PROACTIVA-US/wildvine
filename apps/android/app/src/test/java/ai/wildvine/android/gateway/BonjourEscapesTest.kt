package com.wildvine.android.gateway

import org.junit.Assert.assertEquals
import org.junit.Test

class BonjourEscapesTest {
  @Test
  fun decodeNoop() {
    assertEquals("", BonjourEscapes.decode(""))
    assertEquals("hello", BonjourEscapes.decode("hello"))
  }

  @Test
  fun decodeDecodesDecimalEscapes() {
    assertEquals("Wildvine Gateway", BonjourEscapes.decode("Wildvine\\032Gateway"))
    assertEquals("A B", BonjourEscapes.decode("A\\032B"))
    assertEquals("Peter\u2019s Mac", BonjourEscapes.decode("Peter\\226\\128\\153s Mac"))
  }
}
