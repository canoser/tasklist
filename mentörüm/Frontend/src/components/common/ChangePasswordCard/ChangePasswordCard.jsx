import React, { useState } from 'react';
import Card from '../Card/Card';
import Button from '../Button/Button';
import Input from '../Input/Input';
import { apiClient } from '../../../api/apiClient';

export default function ChangePasswordCard({ className = '', idPrefix = 'user' }) {
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPwError('Şifre en az 6 karakter olmalı.');
      return;
    }
    setPwError('');
    setPwMsg('');
    setPwSaving(true);
    try {
      const res = await apiClient.post('/me/password', { newPassword });
      setPwMsg(res?.message || 'Şifreniz güncellendi.');
      setNewPassword('');
    } catch (err) {
      setPwError(err?.response?.data?.error || 'Şifre oluşturulamadı.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <Card className={className} padding="lg">
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color-main)' }}>
        Şifre Oluştur / Değiştir
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-color-muted)', marginBottom: '12px' }}>
        Google ile giriş yapmış olsanız bile bir şifre belirleyebilir, dilediğinizde e-posta + şifre ile girebilirsiniz.
      </p>
      <form onSubmit={handleSetPassword}>
        <Input
          label="Yeni Şifre"
          type="password"
          id={`${idPrefix}-new-password`}
          name="new-password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="En az 6 karakter"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary" size="md" type="submit" isLoading={pwSaving}>
            Şifreyi Kaydet
          </Button>
          {pwMsg && (
            <span style={{ color: 'var(--color-success, #10b981)', fontSize: '0.85rem', fontWeight: 600 }}>
              ✓ {pwMsg}
            </span>
          )}
          {pwError && (
            <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.85rem', fontWeight: 600 }}>
              {pwError}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

