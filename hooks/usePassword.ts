import { useState, useCallback } from 'react';
import { hashPassword, verifyPassword } from '../lib/password';

export function usePassword(initialEnabled: boolean, initialHash: string) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [storedHash, setStoredHash] = useState(initialHash);
  const [isVerified, setIsVerified] = useState(!initialEnabled);

  const setPassword = useCallback(async (password: string) => {
    const hash = await hashPassword(password);
    setEnabled(true);
    setStoredHash(hash);
    setIsVerified(true);
    return hash;
  }, []);

  const checkPassword = useCallback(
    async (password: string): Promise<boolean> => {
      const valid = await verifyPassword(password, storedHash);
      setIsVerified(valid);
      return valid;
    },
    [storedHash],
  );

  const removePassword = useCallback(() => {
    setEnabled(false);
    setStoredHash('');
    setIsVerified(true);
  }, []);

  const reset = useCallback(() => {
    setEnabled(initialEnabled);
    setStoredHash(initialHash);
    setIsVerified(!initialEnabled);
  }, [initialEnabled, initialHash]);

  return {
    enabled,
    isVerified,
    setPassword,
    checkPassword,
    removePassword,
    reset,
    setEnabled,
    setStoredHash,
    setIsVerified,
  };
}
