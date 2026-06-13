import { defineConfig } from "wxt";
import { writeFileSync, cpSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

const packageAliases: Record<string, string> = {
  "@blocksite/core": resolve(rootDir, "packages/core/src/index.ts"),
  "@blocksite/storage": resolve(rootDir, "packages/storage/src/index.ts"),
  "@blocksite/event-bus": resolve(rootDir, "packages/event-bus/src/index.ts"),
  "@blocksite/rules": resolve(rootDir, "packages/rules/src/index.ts"),
  "@blocksite/schedule": resolve(rootDir, "packages/schedule/src/index.ts"),
  "@blocksite/auth": resolve(rootDir, "packages/auth/src/index.ts"),
  "@blocksite/unlock": resolve(rootDir, "packages/unlock/src/index.ts"),
  "@blocksite/stats": resolve(rootDir, "packages/stats/src/index.ts"),
  "@blocksite/presets": resolve(rootDir, "packages/presets/src/index.ts"),
  "@blocksite/import-export": resolve(rootDir, "packages/import-export/src/index.ts"),
  "@blocksite/ai": resolve(rootDir, "packages/ai/src/index.ts"),
};

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    resolve: {
      alias: packageAliases,
    },
  }),
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
      "scripting",
    ],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "BlockSite",
      default_popup: "popup/index.html",
    },
  },
  hooks: {
    "build:done": () => {
      // Handle both production (.output/chrome-mv3) and dev (.output/chrome-mv3-dev)
      const outputDirs = [".output/chrome-mv3", ".output/chrome-mv3-dev"];
      for (const dir of outputDirs) {
        const outputDir = resolve(dir);
        const manifestPath = resolve(outputDir, "manifest.json");
        if (!existsSync(manifestPath)) continue;

        const manifest = JSON.parse(require("node:fs").readFileSync(manifestPath, "utf-8"));
        manifest.default_locale = "en";
        manifest.options_ui = {
          page: "options.html",
          open_in_tab: true,
        };
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`  │ options_ui.open_in_tab = true (${dir})`);

        const localesSrc = resolve("_locales");
        const localesDest = resolve(outputDir, "_locales");
        if (existsSync(localesSrc)) {
          cpSync(localesSrc, localesDest, { recursive: true });
          console.log(`  │ _locales copied to ${dir}`);
        }
      }
    },
  },
});
