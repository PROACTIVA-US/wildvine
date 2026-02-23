import type { IconName } from "./icons.js";

// ── New product navigation ────────────────────────────────
// Flat nav items (no groups) with bottom-pinned Profile & Settings.

export type Tab =
  | "home"
  | "chat"
  | "agents"
  | "vislzr"
  | "vine-view"
  | "arena"
  | "strategy"
  | "governance"
  | "living-note"
  | "profile"
  | "settings"
  // Legacy tabs — still routable, rendered inside Settings container
  | "overview"
  | "channels"
  | "instances"
  | "sessions"
  | "usage"
  | "cron"
  | "skills"
  | "nodes"
  | "config"
  | "debug"
  | "logs"
  // CC legacy redirects
  | "cc-pipelines"
  | "cc-governor"
  | "cc-kb"
  | "cc-arena"
  | "notes";

export interface NavItem {
  tab: Tab;
  label: string;
  icon: IconName;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { tab: "home", label: "Home", icon: "barChart" },
  { tab: "chat", label: "Chat", icon: "messageSquare" },
  { tab: "agents", label: "Agents", icon: "users" },
  { tab: "vislzr", label: "VISLZR", icon: "zap" },
  { tab: "vine-view", label: "Vine View", icon: "gitBranch" },
  { tab: "arena", label: "Arena", icon: "swords" },
  { tab: "strategy", label: "Strategy", icon: "target" },
  { tab: "governance", label: "Governance", icon: "shield" },
  { tab: "living-note", label: "Living Note", icon: "edit" },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { tab: "profile", label: "Profile", icon: "user" },
  { tab: "settings", label: "Settings", icon: "settings" },
];

// Settings sub-tabs (legacy admin views moved here)
export type SettingsSubTab =
  | "config"
  | "debug"
  | "logs"
  | "channels"
  | "sessions"
  | "usage"
  | "cron"
  | "nodes"
  | "skills"
  | "overview";

export const SETTINGS_SUB_TABS: { key: SettingsSubTab; label: string }[] = [
  { key: "config", label: "Config" },
  { key: "debug", label: "Debug" },
  { key: "logs", label: "Logs" },
  { key: "channels", label: "Channels" },
  { key: "sessions", label: "Sessions" },
  { key: "usage", label: "Usage" },
  { key: "cron", label: "Cron" },
  { key: "nodes", label: "Nodes" },
  { key: "skills", label: "Skills" },
  { key: "overview", label: "Gateway" },
];

// Keep TAB_GROUPS for backward compatibility (some code may reference it)
export const TAB_GROUPS = [
  {
    label: "Main",
    tabs: [
      "home",
      "chat",
      "agents",
      "vislzr",
      "vine-view",
      "arena",
      "strategy",
      "governance",
      "living-note",
    ],
  },
  { label: "Bottom", tabs: ["profile", "settings"] },
] as const;

// ── Path mapping ──────────────────────────────────────────

const TAB_PATHS: Record<Tab, string> = {
  home: "/home",
  chat: "/chat",
  agents: "/agents",
  vislzr: "/vislzr",
  "vine-view": "/vine-view",
  arena: "/arena",
  strategy: "/strategy",
  governance: "/governance",
  "living-note": "/living-note",
  profile: "/profile",
  settings: "/settings",
  // Legacy paths — still routable
  overview: "/overview",
  channels: "/channels",
  instances: "/instances",
  sessions: "/sessions",
  usage: "/usage",
  cron: "/cron",
  skills: "/skills",
  nodes: "/nodes",
  config: "/config",
  debug: "/debug",
  logs: "/logs",
  "cc-pipelines": "/cc-pipelines",
  "cc-governor": "/cc-governor",
  "cc-kb": "/cc-kb",
  "cc-arena": "/cc-arena",
  notes: "/notes",
};

const PATH_TO_TAB = new Map(Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as Tab]));

// Legacy tab → new tab redirects
const TAB_REDIRECTS: Partial<Record<Tab, Tab>> = {
  overview: "home",
  "cc-governor": "governance",
  "cc-arena": "arena",
  "cc-kb": "living-note",
  notes: "living-note",
  "cc-pipelines": "settings",
  config: "settings",
  debug: "settings",
  logs: "settings",
  channels: "settings",
  sessions: "settings",
  usage: "settings",
  cron: "settings",
  skills: "settings",
  nodes: "settings",
  instances: "settings",
};

export function resolveTab(tab: Tab): Tab {
  return TAB_REDIRECTS[tab] ?? tab;
}

// Which settings sub-tab should open for a legacy tab redirect
export function settingsSubTabForLegacy(tab: Tab): SettingsSubTab | null {
  const legacySettingsTabs: Record<string, SettingsSubTab> = {
    config: "config",
    debug: "debug",
    logs: "logs",
    channels: "channels",
    sessions: "sessions",
    usage: "usage",
    cron: "cron",
    skills: "skills",
    nodes: "nodes",
    instances: "nodes",
    overview: "overview",
    "cc-pipelines": "config",
  };
  return legacySettingsTabs[tab] ?? null;
}

export function normalizeBasePath(basePath: string): string {
  if (!basePath) {
    return "";
  }
  let base = basePath.trim();
  if (!base.startsWith("/")) {
    base = `/${base}`;
  }
  if (base === "/") {
    return "";
  }
  if (base.endsWith("/")) {
    base = base.slice(0, -1);
  }
  return base;
}

export function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }
  let normalized = path.trim();
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function pathForTab(tab: Tab, basePath = ""): string {
  const base = normalizeBasePath(basePath);
  const path = TAB_PATHS[tab];
  return base ? `${base}${path}` : path;
}

export function tabFromPath(pathname: string, basePath = ""): Tab | null {
  const base = normalizeBasePath(basePath);
  let path = pathname || "/";
  if (base) {
    if (path === base) {
      path = "/";
    } else if (path.startsWith(`${base}/`)) {
      path = path.slice(base.length);
    }
  }
  let normalized = normalizePath(path).toLowerCase();
  if (normalized.endsWith("/index.html")) {
    normalized = "/";
  }
  if (normalized === "/") {
    return "home";
  }
  return PATH_TO_TAB.get(normalized) ?? null;
}

export function inferBasePathFromPathname(pathname: string): string {
  let normalized = normalizePath(pathname);
  if (normalized.endsWith("/index.html")) {
    normalized = normalizePath(normalized.slice(0, -"/index.html".length));
  }
  if (normalized === "/") {
    return "";
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "";
  }
  for (let i = 0; i < segments.length; i++) {
    const candidate = `/${segments.slice(i).join("/")}`.toLowerCase();
    if (PATH_TO_TAB.has(candidate)) {
      const prefix = segments.slice(0, i);
      return prefix.length ? `/${prefix.join("/")}` : "";
    }
  }
  return `/${segments.join("/")}`;
}

export function iconForTab(tab: Tab): IconName {
  const item = [...MAIN_NAV_ITEMS, ...BOTTOM_NAV_ITEMS].find((n) => n.tab === tab);
  if (item) {
    return item.icon;
  }
  // Legacy tab icons
  switch (tab) {
    case "overview":
      return "barChart";
    case "channels":
      return "link";
    case "instances":
      return "radio";
    case "sessions":
      return "fileText";
    case "usage":
      return "barChart";
    case "cron":
      return "loader";
    case "skills":
      return "zap";
    case "nodes":
      return "monitor";
    case "notes":
      return "edit";
    case "config":
      return "settings";
    case "debug":
      return "bug";
    case "logs":
      return "scrollText";
    case "cc-pipelines":
      return "loader";
    case "cc-governor":
      return "shield";
    case "cc-kb":
      return "search";
    case "cc-arena":
      return "swords";
    default:
      return "folder";
  }
}

export function titleForTab(tab: Tab) {
  const item = [...MAIN_NAV_ITEMS, ...BOTTOM_NAV_ITEMS].find((n) => n.tab === tab);
  if (item) {
    return item.label;
  }
  switch (tab) {
    case "overview":
      return "Overview";
    case "channels":
      return "Channels";
    case "instances":
      return "Instances";
    case "sessions":
      return "Sessions";
    case "usage":
      return "Usage";
    case "cron":
      return "Cron Jobs";
    case "skills":
      return "Skills";
    case "nodes":
      return "Nodes";
    case "notes":
      return "Notes";
    case "config":
      return "Config";
    case "debug":
      return "Debug";
    case "logs":
      return "Logs";
    case "cc-pipelines":
      return "Pipelines";
    case "cc-governor":
      return "Governor";
    case "cc-kb":
      return "Knowledge Base";
    case "cc-arena":
      return "Arena";
    default:
      return "Control";
  }
}

export function subtitleForTab(tab: Tab) {
  switch (tab) {
    case "home":
      return "Dashboard overview and quick actions.";
    case "chat":
      return "Direct gateway chat session for quick interventions.";
    case "agents":
      return "Manage agent personas, voice, skills, and workspaces.";
    case "vislzr":
      return "Visual strategy canvas — nodes, edges, and graph exploration.";
    case "vine-view":
      return "System health tree — agents, channels, and services.";
    case "arena":
      return "Multi-agent deliberation sessions.";
    case "strategy":
      return "Goals, hypotheses, and evidence tracking.";
    case "governance":
      return "Approve or deny pending items in the governance queue.";
    case "living-note":
      return "Capture ideas, search knowledge, and manage notes.";
    case "profile":
      return "Your identity, auth, and preferences.";
    case "settings":
      return "Configuration, debug tools, and admin views.";
    // Legacy tabs
    case "overview":
      return "Gateway status, entry points, and a fast health read.";
    case "channels":
      return "Manage channels and settings.";
    case "instances":
      return "Presence beacons from connected clients and nodes.";
    case "sessions":
      return "Inspect active sessions and adjust per-session defaults.";
    case "usage":
      return "";
    case "cron":
      return "Schedule wakeups and recurring agent runs.";
    case "skills":
      return "Manage skill availability and API key injection.";
    case "nodes":
      return "Paired devices, capabilities, and command exposure.";
    case "notes":
      return "Capture ideas, tasks, and context. Surfaced when relevant.";
    case "config":
      return "Edit ~/.wildvine/wildvine.json safely.";
    case "debug":
      return "Gateway snapshots, events, and manual RPC calls.";
    case "logs":
      return "Live tail of the gateway file logs.";
    case "cc-pipelines":
      return "Run and monitor pipelines.";
    case "cc-governor":
      return "Approve or deny pending items in the governance queue.";
    case "cc-kb":
      return "Search the knowledge base.";
    case "cc-arena":
      return "Multi-agent deliberation sessions.";
    default:
      return "";
  }
}
