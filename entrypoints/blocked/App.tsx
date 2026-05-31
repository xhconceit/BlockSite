import { useState, useEffect, useCallback } from 'react';
import type { Category } from '../../types';
import { getQuote } from '../../lib/quotes';
import { formatCountdown } from '../../utils/format';

function getParam(name: string): string {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
}

export default function App() {
  const ruleId = getParam('ruleId');
  const category = (getParam('category') || 'custom') as Category;
  const customMessage = getParam('customMessage');

  const [blockedUrl, setBlockedUrl] = useState('');
  const [quote] = useState(() => getQuote(category));
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [tempUnlockUntil, setTempUnlockUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'blockPageOpened' }).then((response) => {
      if (response?.blockedUrl) {
        setBlockedUrl(response.blockedUrl);
      }
    });
    checkTempUnlock();
    checkPasswordStatus();
  }, []);

  useEffect(() => {
    if (!tempUnlockUntil) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((tempUnlockUntil - Date.now()) / 1000));
      setCountdown(formatCountdown(remaining));
      if (remaining <= 0) {
        clearInterval(timer);
        setTempUnlockUntil(null);
        setUnlockSuccess(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [tempUnlockUntil]);

  const checkTempUnlock = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'checkTempUnlock' });
    if (response.unlocked) {
      setTempUnlockUntil(response.tempUnlockUntil);
      setUnlockSuccess(true);
    }
  };

  const checkPasswordStatus = async () => {
    const config = await chrome.runtime.sendMessage({ type: 'getConfig' });
    setPasswordEnabled(config.passwordEnabled);
  };

  const handleUnlock = useCallback(async () => {
    if (passwordEnabled) {
      if (!showPasswordInput) {
        setShowPasswordInput(true);
        return;
      }
      const config = await chrome.runtime.sendMessage({ type: 'getConfig' });
      const { verifyPassword } = await import('../../lib/password');
      const valid = await verifyPassword(password, config.passwordHash);
      if (!valid) {
        setError('密码错误');
        return;
      }
    }

    const response = await chrome.runtime.sendMessage({ type: 'tempUnlock', minutes: 5 });
    if (response.success) {
      setTempUnlockUntil(response.tempUnlockUntil);
      setUnlockSuccess(true);
      setShowPasswordInput(false);
      setPassword('');
      setError('');
      if (blockedUrl) {
        window.location.href = blockedUrl;
      }
    }
  }, [passwordEnabled, showPasswordInput, password, blockedUrl]);

  const handleBack = () => {
    window.history.back();
  };

  if (unlockSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8" style={{ backgroundColor: '#0f172a' }}>
        <div className="max-w-md">
          <div className="text-6xl mb-6">🔓</div>
          <h1 className="text-2xl font-bold text-white mb-4">临时解锁中</h1>
          <p className="text-slate-400 mb-2">当前网站已临时解锁，5 分钟后自动恢复拦截。</p>
          {countdown && <p className="text-lg font-mono" style={{ color: quote.themeColor }}>剩余时间：{countdown}</p>}
          {blockedUrl && (
            <a href={blockedUrl} className="inline-block mt-6 px-6 py-2.5 rounded-lg font-medium text-white transition-colors" style={{ backgroundColor: quote.themeColor }}>
              前往网站
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8" style={{ backgroundColor: '#0f172a' }}>
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-3xl font-bold text-white mb-2">网站已被拦截</h1>
          {blockedUrl && <p className="text-slate-400 text-sm break-all">{blockedUrl}</p>}
        </div>

        <div
          className="rounded-2xl p-8 mb-6 text-center border"
          style={{ borderColor: `${quote.themeColor}30`, backgroundColor: `${quote.themeColor}10` }}
        >
          {customMessage ? (
            <p className="text-xl font-medium leading-relaxed text-white">{customMessage}</p>
          ) : (
            <>
              <p className="text-xl font-medium leading-relaxed text-white mb-3">"{quote.text}"</p>
              <p className="text-sm" style={{ color: quote.themeColor }}>— {quote.author}</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleUnlock}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: quote.themeColor }}
          >
            {showPasswordInput ? '确认密码并解锁' : '临时解锁 5 分钟'}
          </button>

          {showPasswordInput && (
            <div className="flex flex-col gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                placeholder={passwordEnabled ? '请输入密码' : '设置密码后方可使用'}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                style={{ focusRingColor: quote.themeColor }}
                autoFocus
              />
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            </div>
          )}

          <button
            onClick={handleBack}
            className="w-full py-2.5 rounded-xl font-medium text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-800 transition-all duration-200 cursor-pointer"
          >
            返回上一页
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          BlockSite — 帮助你保持专注
        </p>
      </div>
    </div>
  );
}
