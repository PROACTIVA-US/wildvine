import { html, nothing, type TemplateResult } from "lit";
import type { SettingsSubTab } from "../navigation.ts";
import { SETTINGS_SUB_TABS } from "../navigation.ts";

export interface SettingsContainerProps {
  activeSubTab: SettingsSubTab;
  onSubTabChange: (tab: SettingsSubTab) => void;
  content: TemplateResult | typeof nothing;
}

export function renderSettingsContainer(props: SettingsContainerProps) {
  return html`
    <div class="stack" style="gap: 16px;">
      <!-- Sub-tab bar -->
      <div class="chip-row" style="flex-wrap: wrap;">
        ${SETTINGS_SUB_TABS.map(
          (st) => html`
            <button class="chip ${props.activeSubTab === st.key ? "chip-ok" : ""}"
              @click=${() => props.onSubTabChange(st.key)}>
              ${st.label}
            </button>
          `,
        )}
      </div>
      <!-- Content area (rendered by parent) -->
      ${props.content}
    </div>
  `;
}
