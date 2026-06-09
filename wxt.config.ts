import { defineConfig } from "wxt";
import { writeFileSync, cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "__MSG_appName__",
    description: "__MSG_appDescription__",
    version: "2.0.0",
    permissions: [
      "declarativeNetRequest",
      "declarativeNetRequestWithHostAccess",
      "storage",
      "alarms",
      "tabs",
      "webNavigation",
    ],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "BlockSite",
      default_popup: "popup/index.html",
    },
  },
  hooks: {
    "build:done": () => {
      const manifestPath = resolve(".output/chrome-mv3/manifest.json");
      const manifest = JSON.parse(require("node:fs").readFileSync(manifestPath, "utf-8"));
      manifest.default_locale = "en";
      manifest.options_ui = {
        page: "options.html",
        open_in_tab: true,
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log("  │ options_ui.open_in_tab = true");

      const localesSrc = resolve("_locales");
      const localesDest = resolve(".output/chrome-mv3/_locales");
      if (existsSync(localesSrc)) {
        cpSync(localesSrc, localesDest, { recursive: true });
        console.log("  │ _locales copied to output");
      }
    },
  },
});
