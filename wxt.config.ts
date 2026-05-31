import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'BlockSite',
    description: '浏览器网站拦截插件 — 帮助你保持专注',
    version: '1.0.0',
    permissions: ['declarativeNetRequest', 'declarativeNetRequestWithHostAccess', 'storage', 'alarms', 'tabs', 'webNavigation'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: '/icons/icon-16.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    action: {
      default_title: 'BlockSite',
      default_popup: 'popup/index.html',
      default_icon: {
        16: '/icons/icon-16.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png',
      },
    },
  },
});
