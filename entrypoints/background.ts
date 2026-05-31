import { loadConfig, saveConfig, updateConfig } from '../lib/storage';
import { applyRules, clearAllRules } from '../lib/rules';
import { setupAlarms, clearAlarms, handleAlarm } from '../lib/scheduler';

const pendingBlockedUrls = new Map<number, string>();

export default defineBackground(() => {
  initializeExtension();

  chrome.runtime.onInstalled.addListener(() => {
    initializeExtension();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true;
  });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    const action = await handleAlarm(alarm);
    if (action === 'start') {
      await updateConfig({ enabled: true });
      await applyCurrentRules();
    } else if (action === 'end') {
      await updateConfig({ enabled: false });
      await clearAllRules();
    }
  });

  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameType === 'outermost_frame' || details.frameId === 0) {
      pendingBlockedUrls.set(details.tabId, details.url);
    }
  });

  chrome.webNavigation.onCommitted.addListener((details) => {
    if ((details.frameType === 'outermost_frame' || details.frameId === 0) &&
        details.url.startsWith(chrome.runtime.getURL(''))) {
      return;
    }
    pendingBlockedUrls.delete(details.tabId);
  });
});

async function initializeExtension(): Promise<void> {
  const config = await loadConfig();
  if (config.enabled) {
    await applyRules(config.blockedItems);
  } else {
    await clearAllRules();
  }
  await setupAlarms(config.schedule);
}

async function applyCurrentRules(): Promise<void> {
  const config = await loadConfig();
  await applyRules(config.blockedItems);
}

async function handleMessage(message: any, sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    case 'getConfig':
      return await loadConfig();

    case 'updateRules': {
      const { items } = message;
      const config = await loadConfig();
      config.blockedItems = items;
      await saveConfig(config);
      if (config.enabled) {
        await applyRules(items);
      }
      return { success: true };
    }

    case 'toggleEnabled': {
      const { enabled } = message;
      const config = await updateConfig({ enabled });
      if (enabled) {
        await applyRules(config.blockedItems);
      } else {
        await clearAllRules();
      }
      return { success: true };
    }

    case 'tempUnlock': {
      const { minutes } = message;
      const until = Date.now() + minutes * 60 * 1000;
      const config = await updateConfig({ tempUnlockUntil: until });
      await clearAllRules();
      setTimeout(async () => {
        const current = await loadConfig();
        if (current.tempUnlockUntil && Date.now() >= current.tempUnlockUntil) {
          await updateConfig({ tempUnlockUntil: null });
          if (current.enabled) {
            await applyRules(current.blockedItems);
          }
        }
      }, minutes * 60 * 1000);
      return { success: true, tempUnlockUntil: until };
    }

    case 'checkTempUnlock': {
      const config = await loadConfig();
      if (config.tempUnlockUntil && Date.now() >= config.tempUnlockUntil) {
        await updateConfig({ tempUnlockUntil: null });
        if (config.enabled) {
          await applyRules(config.blockedItems);
        }
        return { unlocked: false };
      }
      return { unlocked: !!config.tempUnlockUntil && Date.now() < config.tempUnlockUntil, tempUnlockUntil: config.tempUnlockUntil };
    }

    case 'updateSchedule': {
      const { schedule } = message;
      const config = await updateConfig({ schedule });
      await setupAlarms(schedule);
      return { success: true };
    }

    case 'updatePassword': {
      const { enabled, hash } = message;
      await updateConfig({ passwordEnabled: enabled, passwordHash: hash || '' });
      return { success: true };
    }

    case 'setPassword': {
      const { hash } = message;
      await updateConfig({ passwordEnabled: true, passwordHash: hash });
      return { success: true };
    }

    case 'removePassword': {
      await updateConfig({ passwordEnabled: false, passwordHash: '' });
      return { success: true };
    }

    case 'getBlockedUrl': {
      const tabId = sender.tab?.id;
      if (tabId !== undefined && pendingBlockedUrls.has(tabId)) {
        return { url: pendingBlockedUrls.get(tabId) };
      }
      return { url: '' };
    }

    case 'blockPageOpened': {
      const tabId = sender.tab?.id;
      const blockedUrl = tabId !== undefined ? pendingBlockedUrls.get(tabId) || '' : '';

      const config = await loadConfig();
      const today = new Date().toLocaleDateString('zh-CN');
      if (config.stats.todayDate !== today) {
        config.stats.todayDate = today;
        config.stats.todayBlocked = 1;
      } else {
        config.stats.todayBlocked++;
      }
      config.stats.totalBlocked++;
      await saveConfig(config);
      return { success: true, blockedUrl };
    }

    default:
      return { error: 'Unknown message type' };
  }
}
