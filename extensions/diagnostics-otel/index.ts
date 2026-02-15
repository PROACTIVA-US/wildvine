import type { WildvinePluginApi } from "wildvine/plugin-sdk";
import { emptyPluginConfigSchema } from "wildvine/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: WildvinePluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
