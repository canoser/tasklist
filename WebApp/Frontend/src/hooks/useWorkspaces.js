import { useState, useEffect, useCallback } from 'react';
import { workspaceService } from '../services/workspaceService';

export default function useWorkspaces(userId) {
  const [ownedWorkspaces, setOwnedWorkspaces] = useState([]);
  const [joinedWorkspaces, setJoinedWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [owned, joined] = await Promise.all([
        workspaceService.getOwned(userId),
        workspaceService.getMemberOf(userId)
      ]);
      setOwnedWorkspaces(owned);
      setJoinedWorkspaces(joined);
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

  const joinWorkspace = async (code) => {
    try {
      const workspace = await workspaceService.joinWithCode(userId, code);
      setJoinedWorkspaces(prev => [...prev, workspace]);
      return workspace;
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Alana katılım başarısız';
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const assignTask = async (workspaceId, taskData) => {
    return await workspaceService.assignTask(workspaceId, taskData);
  };

  const deleteTask = async (workspaceId, batchId) => {
    return await workspaceService.deleteTask(workspaceId, batchId);
  };

  const promoteMember = async (workspaceId, memberId) => {
    return await workspaceService.promoteMember(workspaceId, memberId);
  };

  const leaveWorkspace = async (workspaceId) => {
    await workspaceService.leaveWorkspace(workspaceId);
    setJoinedWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
  };

  return {
    ownedWorkspaces,
    joinedWorkspaces,
    loading,
    error,
    createWorkspace,
    joinWorkspace,
    assignTask,
    deleteTask,
    promoteMember,
    leaveWorkspace,
    refresh: fetchWorkspaces
  };
}
