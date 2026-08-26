import { useState, useEffect, useCallback } from 'react';
import { workspaceService } from '../services/workspaceService';
import storage from '../utils/storage';

const DEFAULT_MOCK_OWNED = [
  {
    id: 'mock-ws-1',
    name: 'YKS 2026 Çalışma Grubu',
    ownerId: 'guest',
    memberCount: 4,
    tasksCount: 12,
    inviteCode: 'YKS26',
    description: 'Hedef ilk 1000! Günlük soru ve deneme takibi.'
  },
  {
    id: 'mock-ws-2',
    name: 'Yazılım & Proje Ekibi',
    ownerId: 'guest',
    memberCount: 3,
    tasksCount: 8,
    inviteCode: 'DEV01',
    description: 'Mobil uygulama sprint planlaması.'
  }
];

const DEFAULT_MOCK_JOINED = [
  {
    id: 'mock-ws-3',
    name: 'Matematik Kulübü',
    ownerId: 'other-user',
    memberCount: 6,
    tasksCount: 15,
    description: 'Haftalık problem çözümleri ve tartışmalar.'
  }
];

export default function useWorkspaces(userId) {
  const [ownedWorkspaces, setOwnedWorkspaces] = useState(() => {
    if (!userId) {
      return storage.get('guest_owned_workspaces') || DEFAULT_MOCK_OWNED;
    }
    return [];
  });
  const [joinedWorkspaces, setJoinedWorkspaces] = useState(() => {
    if (!userId) {
      return storage.get('guest_joined_workspaces') || DEFAULT_MOCK_JOINED;
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!userId) {
      const owned = storage.get('guest_owned_workspaces') || DEFAULT_MOCK_OWNED;
      const joined = storage.get('guest_joined_workspaces') || DEFAULT_MOCK_JOINED;
      setOwnedWorkspaces(owned);
      setJoinedWorkspaces(joined);
      return;
    }
    setLoading(true);
    try {
      const [owned, joined] = await Promise.all([
        workspaceService.getOwned(userId),
        workspaceService.getMemberOf(userId)
      ]);
      setOwnedWorkspaces(owned || []);
      setJoinedWorkspaces(joined || []);
    } catch (err) {
      console.error(err);
      setError('Çalışma alanları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const createWorkspace = async (data) => {
    if (!userId) {
      const newWs = {
        id: `mock-${Date.now()}`,
        name: data.name,
        description: data.description || '',
        ownerId: 'guest',
        memberCount: 1,
        tasksCount: 0,
        inviteCode: Math.random().toString(36).substring(2, 7).toUpperCase(),
        createdAt: new Date().toISOString()
      };
      const updated = [newWs, ...ownedWorkspaces];
      setOwnedWorkspaces(updated);
      storage.set('guest_owned_workspaces', updated);
      return newWs;
    }
    try {
      const newWorkspace = await workspaceService.create({ ...data, ownerId: userId });
      setOwnedWorkspaces(prev => [...prev, newWorkspace]);
      return newWorkspace;
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Alan oluşturulamadı';
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const deleteWorkspace = async (id) => {
    if (!userId) {
      const updated = ownedWorkspaces.filter(w => w.id !== id);
      setOwnedWorkspaces(updated);
      storage.set('guest_owned_workspaces', updated);
      return;
    }
    try {
      await workspaceService.delete(id);
      setOwnedWorkspaces(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Alan silinemedi';
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const joinWorkspace = async (code, displayName) => {
    if (!userId) {
      const joinedWs = {
        id: `mock-joined-${Date.now()}`,
        name: `Katılınan Alan (${code})`,
        ownerId: 'other-user',
        memberCount: 5,
        tasksCount: 4,
        description: `${displayName || 'Kullanıcı'} olarak katıldınız.`
      };
      const updated = [...joinedWorkspaces, joinedWs];
      setJoinedWorkspaces(updated);
      storage.set('guest_joined_workspaces', updated);
      return joinedWs;
    }
    try {
      const member = await workspaceService.joinWithCode(userId, code, displayName);
      await fetchWorkspaces();
      return member;
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Alana katılım başarısız';
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const assignTask = async (workspaceId, taskData) => {
    if (!userId) return { success: true };
    return await workspaceService.assignTask(workspaceId, taskData);
  };

  const deleteTask = async (workspaceId, batchId) => {
    if (!userId) return { success: true };
    return await workspaceService.deleteTask(workspaceId, batchId);
  };

  const promoteMember = async (workspaceId, memberId) => {
    if (!userId) return { success: true };
    return await workspaceService.promoteMember(workspaceId, memberId);
  };

  const approveMember = async (workspaceId, memberId) => {
    if (!userId) return { success: true };
    return await workspaceService.approveMember(workspaceId, memberId);
  };

  const rejectMember = async (workspaceId, memberId) => {
    if (!userId) return { success: true };
    return await workspaceService.rejectMember(workspaceId, memberId);
  };

  const leaveWorkspace = async (workspaceId) => {
    if (!userId) {
      const updated = joinedWorkspaces.filter(w => w.id !== workspaceId);
      setJoinedWorkspaces(updated);
      storage.set('guest_joined_workspaces', updated);
      return;
    }
    await workspaceService.leaveWorkspace(workspaceId);
    setJoinedWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
  };

  return {
    ownedWorkspaces,
    joinedWorkspaces,
    loading,
    error,
    createWorkspace,
    deleteWorkspace,
    joinWorkspace,
    assignTask,
    deleteTask,
    promoteMember,
    approveMember,
    rejectMember,
    leaveWorkspace,
    refresh: fetchWorkspaces
  };
}
