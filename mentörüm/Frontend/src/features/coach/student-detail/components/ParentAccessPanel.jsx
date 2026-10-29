import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import Input from '../../../../components/common/Input/Input';
import ParentPermissionsPanel from '../ParentPermissionsPanel';
import { Users, Mail, Shield, Copy, Check, Clock, UserPlus } from 'lucide-react';
import { useSendInvite } from '../../coachApi';

const ParentAccessPanel = ({ student, onInviteSuccess }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendEmailDirectly, setSendEmailDirectly] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [copiedToken, setCopiedToken] = useState(null);

  const sendInviteMutation = useSendInvite();

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    sendInviteMutation.mutate({
      email: inviteEmail.trim(),
      role: 'Parent',
      studentId: student?.id,
      sendEmail: sendEmailDirectly
    }, {
      onSuccess: (data) => {
        setInviteEmail('');
        if (onInviteSuccess) onInviteSuccess(data);
      }
    });
  };

  const handleCopyLink = (token) => {
    const inviteUrl = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const parents = student?.parents || [];
  const pendingInvites = student?.pendingParentInvites || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Kayıtlı Veliler */}
      <Card title="Kayıtlı Veliler ve İzin Matrisi">
        {parents.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-color-muted)' }}>
            Bu öğrenciye kayıtlı veli bulunmamaktadır. Aşağıdaki formdan veli davet edebilirsiniz.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {parents.map((parent) => (
              <div
                key={parent.parentId || parent.id}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-color-main)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-color-main)' }}>
                      {parent.fullName || 'Veli'}
                    </span>
                    {parent.relation && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)', marginLeft: '8px' }}>
                        ({parent.relation})
                      </span>
                    )}
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-color-muted)', marginTop: '2px' }}>
                      {parent.email || parent.phone || '-'}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedParentId(selectedParentId === (parent.parentId || parent.id) ? null : (parent.parentId || parent.id))}
                  >
                    <Shield size={14} style={{ marginRight: '6px' }} />
                    {selectedParentId === (parent.parentId || parent.id) ? 'İzinleri Gizle' : 'İzinleri Yönet'}
                  </Button>
                </div>

                {selectedParentId === (parent.parentId || parent.id) && (
                  <ParentPermissionsPanel
                    studentId={student.id}
                    parentId={parent.parentId || parent.id}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 2. Bekleyen Veli Davetleri */}
      {pendingInvites.length > 0 && (
        <Card title="Onay Bekleyen Veli Davetleri">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px dashed var(--border-color)',
                  backgroundColor: 'var(--bg-color-surface)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: '#f59e0b' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{invite.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                      Son geçerlilik: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString('tr-TR') : '-'}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(invite.token)}
                >
                  {copiedToken === invite.token ? (
                    <>
                      <Check size={14} style={{ marginRight: '4px', color: '#10b981' }} />
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy size={14} style={{ marginRight: '4px' }} />
                      Davet Linkini Kopyala
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 3. Yeni Veli Davet Et */}
      <Card title="Yeni Veli Davet Et (Anne, Baba vb.)">
        <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <Input
                label="Veli E-Posta Adresi"
                type="email"
                required
                placeholder="veli@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={sendInviteMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={sendInviteMutation.isPending}
            >
              <UserPlus size={16} style={{ marginRight: '6px' }} />
              {sendInviteMutation.isPending ? 'Davet Oluşturuluyor...' : 'Davet Oluştur'}
            </Button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: 'var(--text-color-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={sendEmailDirectly}
              onChange={(e) => setSendEmailDirectly(e.target.checked)}
            />
            <span>E-posta servisi (Resend) ile veliye otomatik aktivasyon e-postası da gönderilsin</span>
          </label>
        </form>
      </Card>
    </div>
  );
};

export default ParentAccessPanel;

