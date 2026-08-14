import { USE_MOCK } from '../config/featureFlags';

let mockWorkspaces = [
  {
    id: 1,
    ownerId: 'mock-user-demo',
    name: '9-A Sınıfı',
    description: '9A Sınıfı matematik grubu',
    inviteCode: 'A1B2C3',
    isActive: true,
  },
  {
    id: 2,
    ownerId: 'other-user',
    name: 'Yazılım Ekibi',
    description: 'Frontend takımı',
    inviteCode: 'X9Y8Z7',
    isActive: true,
  }
];

let mockMembers = [
  { id: 1, workspaceId: 2, userId: 'mock-user-demo', displayName: 'Geliştirici', joinedAt: new Date().toISOString() }
];

export const workspaceService = {
  getOwned: async (ownerId) => {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        resolve(mockWorkspaces.filter(w => w.ownerId === ownerId && w.isActive));
      }, 300));
    }
    const response = await fetch(`/api/workspace/owned/${ownerId}`);
    return response.json();
  },

  getMemberOf: async (userId) => {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        const workspaceIds = mockMembers.filter(m => m.userId === userId).map(m => m.workspaceId);
        resolve(mockWorkspaces.filter(w => workspaceIds.includes(w.id) && w.isActive));
      }, 300));
    }
    const response = await fetch(`/api/workspace/member/${userId}`);
    return response.json();
  },

  create: async (workspaceData) => {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        const newWorkspace = {
          ...workspaceData,
          id: Date.now(),
          inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          isActive: true
        };
        mockWorkspaces.push(newWorkspace);
        resolve(newWorkspace);
      }, 300));
    }
    const response = await fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workspaceData)
    });
    return response.json();
  },

  joinWithCode: async (userId, code) => {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const workspace = mockWorkspaces.find(w => w.inviteCode === code && w.isActive);
        if (!workspace) return reject(new Error('Geçersiz davet kodu'));
        
        const existing = mockMembers.find(m => m.workspaceId === workspace.id && m.userId === userId);
        if (existing) return reject(new Error('Zaten bu alana üyesiniz'));

        const newMember = {
          id: Date.now(),
          workspaceId: workspace.id,
          userId,
          displayName: 'Yeni Üye', // Owner will update this
          joinedAt: new Date().toISOString()
        };
        mockMembers.push(newMember);
        resolve(workspace);
      }, 300));
    }
    const response = await fetch(`/api/workspace/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code })
    });
    if (!response.ok) throw new Error('Katılım başarısız');
    return response.json();
  },

  getMembers: async (workspaceId) => {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        resolve(mockMembers.filter(m => m.workspaceId === workspaceId));
      }, 300));
    }
    const response = await fetch(`/api/workspace/${workspaceId}/members`);
    return response.json();
  },

  updateMemberDisplayName: async (memberId, displayName) => {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        const member = mockMembers.find(m => m.id === memberId);
        if (member) member.displayName = displayName;
        resolve(true);
      }, 300));
    }
    await fetch(`/api/workspace/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(displayName) // or { displayName } depending on API
    });
    return true;
  },

  assignTask: async (workspaceId, taskData) => {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => resolve({ Message: "Mock assigned", BatchId: "mock-batch" }), 300));
    }
    const response = await fetch(`/api/workspace/${workspaceId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    if (!response.ok) throw new Error('Görev atanamadı');
    return response.json();
  },

  deleteTask: async (workspaceId, batchId) => {
    if (USE_MOCK) return Promise.resolve(true);
    const response = await fetch(`/api/workspace/${workspaceId}/tasks/${batchId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Görev silinemedi');
    return response.json();
  },

  promoteMember: async (workspaceId, userId) => {
    if (USE_MOCK) return Promise.resolve(true);
    const response = await fetch(`/api/workspace/${workspaceId}/members/${userId}/promote`, { method: 'POST' });
    if (!response.ok) throw new Error('Yetki verilemedi');
    return true;
  },

  leaveWorkspace: async (workspaceId) => {
    if (USE_MOCK) return Promise.resolve(true);
    const response = await fetch(`/api/workspace/${workspaceId}/leave`, { method: 'POST' });
    if (!response.ok) throw new Error('Alandan ayrılma başarısız');
    return true;
  }
};
