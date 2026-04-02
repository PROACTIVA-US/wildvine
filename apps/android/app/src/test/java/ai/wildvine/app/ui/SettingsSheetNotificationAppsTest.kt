package com.wildvine.android.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class SettingsSheetNotificationAppsTest {
  @Test
  fun resolveNotificationCandidatePackages_keepsConfiguredPackagesVisible() {
    val packages =
      resolveNotificationCandidatePackages(
        launcherPackages = setOf("com.example.launcher"),
        recentPackages = listOf("com.example.recent", "com.example.launcher"),
        configuredPackages = setOf("com.example.configured"),
        appPackageName = "com.wildvine.android",
      )

    assertEquals(
      setOf("com.example.launcher", "com.example.recent", "com.example.configured"),
      packages,
    )
  }

  @Test
  fun resolveNotificationCandidatePackages_filtersBlankAndSelfPackages() {
    val packages =
      resolveNotificationCandidatePackages(
        launcherPackages = setOf(" ", "com.wildvine.android"),
        recentPackages = listOf("com.example.recent", "  "),
        configuredPackages = setOf("com.wildvine.android", "com.example.configured"),
        appPackageName = "com.wildvine.android",
      )

    assertEquals(setOf("com.example.recent", "com.example.configured"), packages)
  }
}
