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
      throw new Error('Alan oluşturulamadı');
    }
  };

  const joinWorkspace = async (code) => {
    try {
      const workspace = await workspaceService.joinWithCode(userId, code);
      setJoinedWorkspaces(prev => [...prev, workspace]);
      return workspace;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return {
    ownedWorkspaces,
    joinedWorkspaces,
    loading,
    error,
    createWorkspace,
    joinWorkspace,
    refresh: fetchWorkspaces
  };
}
