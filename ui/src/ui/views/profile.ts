import { html } from "lit";

export interface ProfileViewProps {
  connected: boolean;
  gatewayUrl: string;
  password: string;
  theme: string;
  onPasswordChange: (v: string) => void;
  onThemeChange: (theme: string) => void;
}

export function renderProfile(props: ProfileViewProps) {
  return html`
    <div class="stack" style="gap: 20px; max-width: 600px;">
      <div class="card">
        <div class="card-title">Identity</div>
        <div class="card-sub">Your profile and authentication</div>
        <div class="form-grid" style="margin-top: 16px;">
          <div class="field">
            <span>Gateway URL</span>
            <input type="text" readonly .value=${props.gatewayUrl} />
          </div>
          <div class="field">
            <span>Password</span>
            <input type="password" placeholder="Gateway password" .value=${props.password}
              @input=${(e: InputEvent) => props.onPasswordChange((e.target as HTMLInputElement).value)} />
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Connection</div>
        <div class="status-list" style="margin-top: 12px;">
          <div>
            <span>Status</span>
            <span>${
              props.connected
                ? html`
                    <span style="color: var(--ok)">Connected</span>
                  `
                : html`
                    <span style="color: var(--danger)">Disconnected</span>
                  `
            }</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
