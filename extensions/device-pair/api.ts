export {
  approveDevicePairing,
  clearDeviceBootstrapTokens,
  issueDeviceBootstrapToken,
  PAIRING_SETUP_BOOTSTRAP_PROFILE,
  listDevicePairing,
  revokeDeviceBootstrapToken,
  type DeviceBootstrapProfile,
} from "wildvine/plugin-sdk/device-bootstrap";
export { definePluginEntry, type WildvinePluginApi } from "wildvine/plugin-sdk/plugin-entry";
export {
  resolveGatewayBindUrl,
  resolveGatewayPort,
  resolveTailnetHostWithRunner,
} from "wildvine/plugin-sdk/core";
export {
  resolvePreferredWildvineTmpDir,
  runPluginCommandWithTimeout,
} from "wildvine/plugin-sdk/sandbox";
export { renderQrPngBase64 } from "./qr-image.js";
