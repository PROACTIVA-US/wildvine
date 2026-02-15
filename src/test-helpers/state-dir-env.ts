type StateDirEnvSnapshot = {
  wildvineStateDir: string | undefined;
  wildvinebotStateDir: string | undefined;
};

export function snapshotStateDirEnv(): StateDirEnvSnapshot {
  return {
    wildvineStateDir: process.env.WILDVINE_STATE_DIR,
    wildvinebotStateDir: process.env.WILDVINE_STATE_DIR,
  };
}

export function restoreStateDirEnv(snapshot: StateDirEnvSnapshot): void {
  if (snapshot.wildvineStateDir === undefined) {
    delete process.env.WILDVINE_STATE_DIR;
  } else {
    process.env.WILDVINE_STATE_DIR = snapshot.wildvineStateDir;
  }
  if (snapshot.wildvinebotStateDir === undefined) {
    delete process.env.WILDVINE_STATE_DIR;
  } else {
    process.env.WILDVINE_STATE_DIR = snapshot.wildvinebotStateDir;
  }
}

export function setStateDirEnv(stateDir: string): void {
  process.env.WILDVINE_STATE_DIR = stateDir;
  delete process.env.WILDVINE_STATE_DIR;
}
