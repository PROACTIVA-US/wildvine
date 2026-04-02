import chalk, { Chalk } from "chalk";
import { VINE_PALETTE } from "./palette.js";

const hasForceColor =
  typeof process.env.FORCE_COLOR === "string" &&
  process.env.FORCE_COLOR.trim().length > 0 &&
  process.env.FORCE_COLOR.trim() !== "0";

const baseChalk = process.env.NO_COLOR && !hasForceColor ? new Chalk({ level: 0 }) : chalk;

const hex = (value: string) => baseChalk.hex(value);

export const theme = {
  accent: hex(VINE_PALETTE.accent),
  accentBright: hex(VINE_PALETTE.accentBright),
  accentDim: hex(VINE_PALETTE.accentDim),
  info: hex(VINE_PALETTE.info),
  success: hex(VINE_PALETTE.success),
  warn: hex(VINE_PALETTE.warn),
  error: hex(VINE_PALETTE.error),
  muted: hex(VINE_PALETTE.muted),
  heading: baseChalk.bold.hex(VINE_PALETTE.accent),
  command: hex(VINE_PALETTE.accentBright),
  option: hex(VINE_PALETTE.warn),
} as const;

export const isRich = () => Boolean(baseChalk.level > 0);

export const colorize = (rich: boolean, color: (value: string) => string, value: string) =>
  rich ? color(value) : value;
