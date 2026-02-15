import Foundation

// Stable identifier used for both the macOS LaunchAgent label and Nix-managed defaults suite.
// nix-wildvine writes app defaults into this suite to survive app bundle identifier churn.
let launchdLabel = "com.wildvine.mac"
let gatewayLaunchdLabel = "com.wildvine.gateway"
let onboardingVersionKey = "wildvine.onboardingVersion"
let onboardingSeenKey = "wildvine.onboardingSeen"
let currentOnboardingVersion = 7
let pauseDefaultsKey = "wildvine.pauseEnabled"
let iconAnimationsEnabledKey = "wildvine.iconAnimationsEnabled"
let swabbleEnabledKey = "wildvine.swabbleEnabled"
let swabbleTriggersKey = "wildvine.swabbleTriggers"
let voiceWakeTriggerChimeKey = "wildvine.voiceWakeTriggerChime"
let voiceWakeSendChimeKey = "wildvine.voiceWakeSendChime"
let showDockIconKey = "wildvine.showDockIcon"
let defaultVoiceWakeTriggers = ["wildvine"]
let voiceWakeMaxWords = 32
let voiceWakeMaxWordLength = 64
let voiceWakeMicKey = "wildvine.voiceWakeMicID"
let voiceWakeMicNameKey = "wildvine.voiceWakeMicName"
let voiceWakeLocaleKey = "wildvine.voiceWakeLocaleID"
let voiceWakeAdditionalLocalesKey = "wildvine.voiceWakeAdditionalLocaleIDs"
let voicePushToTalkEnabledKey = "wildvine.voicePushToTalkEnabled"
let talkEnabledKey = "wildvine.talkEnabled"
let iconOverrideKey = "wildvine.iconOverride"
let connectionModeKey = "wildvine.connectionMode"
let remoteTargetKey = "wildvine.remoteTarget"
let remoteIdentityKey = "wildvine.remoteIdentity"
let remoteProjectRootKey = "wildvine.remoteProjectRoot"
let remoteCliPathKey = "wildvine.remoteCliPath"
let canvasEnabledKey = "wildvine.canvasEnabled"
let cameraEnabledKey = "wildvine.cameraEnabled"
let systemRunPolicyKey = "wildvine.systemRunPolicy"
let systemRunAllowlistKey = "wildvine.systemRunAllowlist"
let systemRunEnabledKey = "wildvine.systemRunEnabled"
let locationModeKey = "wildvine.locationMode"
let locationPreciseKey = "wildvine.locationPreciseEnabled"
let peekabooBridgeEnabledKey = "wildvine.peekabooBridgeEnabled"
let deepLinkKeyKey = "wildvine.deepLinkKey"
let modelCatalogPathKey = "wildvine.modelCatalogPath"
let modelCatalogReloadKey = "wildvine.modelCatalogReload"
let cliInstallPromptedVersionKey = "wildvine.cliInstallPromptedVersion"
let heartbeatsEnabledKey = "wildvine.heartbeatsEnabled"
let debugPaneEnabledKey = "wildvine.debugPaneEnabled"
let enabledModelProvidersKey = "wildvine.enabledModelProviders"
let debugFileLogEnabledKey = "wildvine.debug.fileLogEnabled"
let appLogLevelKey = "wildvine.debug.appLogLevel"
let voiceWakeSupported: Bool = ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26
