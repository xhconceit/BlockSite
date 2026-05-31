import { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { showToast } from './ui/Toast';

interface PasswordConfigProps {
  enabled: boolean;
  isVerified: boolean;
  onSetPassword: (password: string) => Promise<string>;
  onCheckPassword: (password: string) => Promise<boolean>;
  onRemovePassword: () => void;
  onSave: (enabled: boolean, hash: string) => void;
}

export default function PasswordConfig({
  enabled,
  isVerified,
  onSetPassword,
  onCheckPassword,
  onRemovePassword,
  onSave,
}: PasswordConfigProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'setting' | 'verifying' | 'removing'>('idle');

  const handleSetPassword = async () => {
    if (password.length < 4) {
      setError('密码至少 4 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    setStatus('setting');
    const hash = await onSetPassword(password);
    await onSave(true, hash);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setStatus('idle');
    showToast('密码已设置', 'success');
  };

  const handleVerifyPassword = async () => {
    setStatus('verifying');
    const valid = await onCheckPassword(password);
    if (valid) {
      showToast('密码验证成功', 'success');
      setPassword('');
      setError('');
    } else {
      setError('密码错误');
    }
    setStatus('idle');
  };

  const handleRemove = async () => {
    setStatus('removing');
    onRemovePassword();
    await onSave(false, '');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setStatus('idle');
    showToast('密码已移除', 'info');
  };

  return (
    <div className="flex flex-col gap-6">
      {enabled ? (
        <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[var(--color-text)]">密码保护已启用</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">修改设置和临时解锁需要输入密码</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">已启用</span>
          </div>
          <Button variant="danger" size="sm" className="mt-4" onClick={handleRemove}>
            移除密码保护
          </Button>
        </div>
      ) : (
        <>
          <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <h3 className="font-medium text-[var(--color-text)] mb-1">设置密码</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              设置密码后，修改拦截规则、关闭拦截、临时解锁都需要验证密码
            </p>
            <div className="flex flex-col gap-3">
              <Input
                type="password"
                label="新密码"
                placeholder="至少 4 位"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
              />
              <Input
                type="password"
                label="确认密码"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                error={error}
              />
              <Button variant="primary" onClick={handleSetPassword} disabled={status === 'setting'}>
                {status === 'setting' ? '设置中...' : '启用密码保护'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
