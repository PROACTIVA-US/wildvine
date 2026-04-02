import { listSkillCommandsForAgents as listSkillCommandsForAgentsImpl } from "wildvine/plugin-sdk/command-auth";

type ListSkillCommandsForAgents =
  typeof import("wildvine/plugin-sdk/command-auth").listSkillCommandsForAgents;

export function listSkillCommandsForAgents(
  ...args: Parameters<ListSkillCommandsForAgents>
): ReturnType<ListSkillCommandsForAgents> {
  return listSkillCommandsForAgentsImpl(...args);
}
