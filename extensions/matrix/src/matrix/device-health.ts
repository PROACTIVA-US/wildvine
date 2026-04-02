export type MatrixManagedDeviceInfo = {
  deviceId: string;
  displayName: string | null;
  current: boolean;
};

export type MatrixDeviceHealthSummary = {
  currentDeviceId: string | null;
  staleWildvineDevices: MatrixManagedDeviceInfo[];
  currentWildvineDevices: MatrixManagedDeviceInfo[];
};

const WILDVINE_DEVICE_NAME_PREFIX = "Wildvine ";

export function isWildvineManagedMatrixDevice(displayName: string | null | undefined): boolean {
  return displayName?.startsWith(WILDVINE_DEVICE_NAME_PREFIX) === true;
}

export function summarizeMatrixDeviceHealth(
  devices: MatrixManagedDeviceInfo[],
): MatrixDeviceHealthSummary {
  const currentDeviceId = devices.find((device) => device.current)?.deviceId ?? null;
  const openClawDevices = devices.filter((device) =>
    isWildvineManagedMatrixDevice(device.displayName),
  );
  return {
    currentDeviceId,
    staleWildvineDevices: openClawDevices.filter((device) => !device.current),
    currentWildvineDevices: openClawDevices.filter((device) => device.current),
  };
}
