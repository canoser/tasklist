import apiClient from './apiClient';

export const workspaceService = {
  getOwned: async (ownerId) => {
    const response = await apiClient.get(`/workspace/owned/${ownerId}`);
    return response.data;
  },

  getMemberOf: async (userId) => {
    const response = await apiClient.get(`/workspace/member/${userId}`);
    return response.data;
  },

  create: async (workspaceData) => {
    const response = await apiClient.post('/workspace', workspaceData);
    return response.data;
  },

  update: async (workspaceId, workspaceData) => {
    const response = await apiClient.put(`/workspace/${workspaceId}`, workspaceData);
    return response.data;
  },

  delete: async (workspaceId) => {
    const response = await apiClient.delete(`/workspace/${workspaceId}`);
    return response.data;
  },

  joinWithCode: async (userId, code, displayName) => {
    // API expects InviteCode and DisplayName
    const response = await apiClient.post(`/workspace/join`, { 
      inviteCode: code, 
      displayName: displayName || 'Yeni Üye' 
    });
    return response.data;
  },

  getMembers: async (workspaceId) => {
    const response = await apiClient.get(`/workspace/${workspaceId}/members`);
    return response.data;
  },

  getPendingMembers: async (workspaceId) => {
    const response = await apiClient.get(`/workspace/${workspaceId}/members/pending`);
    return response.data;
  },

  approveMember: async (workspaceId, memberId) => {
    await apiClient.post(`/workspace/${workspaceId}/members/${memberId}/approve`);
    return true;
  },

  rejectMember: async (workspaceId, memberId) => {
    await apiClient.post(`/workspace/${workspaceId}/members/${memberId}/reject`);
    return true;
  },

  updateMemberDisplayName: async (memberId, displayName) => {
    await apiClient.put(`/workspace/members/${memberId}`, `"${displayName}"`, {
      headers: { 'Content-Type': 'application/json' }
    });
    return true;
  },

  getWorkspaceTasks: async (workspaceId) => {
    const response = await apiClient.get(`/workspace/${workspaceId}/tasks`);
    return response.data;
  },

  assignTask: async (workspaceId, taskData, idempotencyKey = null) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const response = await apiClient.post(`/workspace/${workspaceId}/tasks`, taskData, { headers });
    return response.data;
  },

  deleteTask: async (workspaceId, batchId) => {
    const response = await apiClient.delete(`/workspace/${workspaceId}/tasks/${batchId}`);
    return response.data;
  },

  getWorkspaceFiles: async (workspaceId) => {
    const response = await apiClient.get(`/workspace/${workspaceId}/files`);
    return response.data;
  },

  deleteWorkspaceFile: async (workspaceId, fileId) => {
    const response = await apiClient.delete(`/workspace/${workspaceId}/files/${fileId}`);
    return response.data;
  },

  promoteMember: async (workspaceId, userId) => {
    await apiClient.post(`/workspace/${workspaceId}/members/${userId}/promote`);
    return true;
  },
  
  removeMember: async (workspaceId, userId) => {
    await apiClient.delete(`/workspace/${workspaceId}/members/${userId}`);
    return true;
  },

  leaveWorkspace: async (workspaceId) => {
    await apiClient.post(`/workspace/${workspaceId}/leave`);
    return true;
  }
};
