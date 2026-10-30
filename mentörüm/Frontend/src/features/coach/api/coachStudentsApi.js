import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/apiClient';
import { queryKeys } from '../../../api/queryKeys';

export const useStudents = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.students(),
    queryFn: async () => {
      const response = await apiClient.get('/students');
      return response || [];
    },
    enabled,
  });
};

export const useSendInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role, relatedId }) => {
      const response = await apiClient.post('/invites/send', { email, role, relatedId });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.students() });
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.pendingInvites() });
    },
  });
};

export const usePendingInvites = () => {
  return useQuery({
    queryKey: queryKeys.coach.pendingInvites(),
    queryFn: async () => {
      const response = await apiClient.get('/invites/pending');
      return response || [];
    },
  });
};

export const useStudent = (id) => {
  return useQuery({
    queryKey: queryKeys.coach.student(id),
    queryFn: async () => {
      const response = await apiClient.get(`/students/${id}`);
      return response || null;
    },
    enabled: !!id,
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentId) => {
      return await apiClient.delete(`/students/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.students() });
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.studentAll() });
    },
  });
};

export const useCoachStudentNotes = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentNotes(studentId),
    queryFn: async () => {
      const response = await apiClient.get(`/students/${studentId}/notes`);
      return response || [];
    },
    enabled: !!studentId && enabled,
  });
};

export const useCreateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/students', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.coach.students() }),
  });
};

export const useInviteStudent = (programId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, email }) => apiClient.post(`/programs/${programId}/students/${studentId}/invite`, { email }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.coach.students() }),
  });
};

export const useMoveToGroup = (programId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, groupId }) => apiClient.post(`/programs/${programId}/students/${studentId}/move-to-group`, { groupId }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.coach.students() });
      qc.invalidateQueries({ queryKey: ['coach', 'program', programId, 'groups'] });
      qc.invalidateQueries({ queryKey: ['coach', 'program', programId, 'group'] });
      qc.invalidateQueries({ queryKey: queryKeys.coach.student(v.studentId ?? v) });
    },
  });
};

export const useMoveToIndividual = (programId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId) => apiClient.post(`/programs/${programId}/students/${studentId}/move-to-individual`),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.coach.students() });
      qc.invalidateQueries({ queryKey: ['coach', 'program', programId, 'groups'] });
      qc.invalidateQueries({ queryKey: ['coach', 'program', programId, 'group'] });
      qc.invalidateQueries({ queryKey: queryKeys.coach.student(v.studentId ?? v) });
    },
  });
};

export const useUpdateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }) => apiClient.put(`/students/${studentId}`, data),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.coach.students() });
      qc.invalidateQueries({ queryKey: queryKeys.coach.student(v.studentId) });
    },
  });
};

export const useUpdateCoachNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, notes }) => {
      const response = await apiClient.post(`/students/${studentId}/notes`, { content: notes });
      return response;
    },
    onMutate: async ({ studentId, notes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.coach.student(studentId) });
      const previousStudent = queryClient.getQueryData(queryKeys.coach.student(studentId));

      queryClient.setQueryData(queryKeys.coach.student(studentId), (old) => {
        if (!old) return old;
        return { ...old, coachNotes: notes };
      });

      return { previousStudent };
    },
    onError: (err, variables, context) => {
      if (context?.previousStudent) {
        queryClient.setQueryData(queryKeys.coach.student(variables.studentId), context.previousStudent);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.student(variables.studentId) });
    },
  });
};

export const useUpdateCoachProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return await apiClient.patch('/me/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
};

export const useCoachStudentSessions = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentSessions(studentId),
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/sessions`)) || [];
    },
    enabled: !!studentId && enabled,
  });
};

export const useCreateCoachingSession = (studentId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return await apiClient.post(`/students/${studentId}/sessions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.studentSessions(studentId) });
    },
  });
};

export const useParentPermissions = (studentId, parentId) => {
  return useQuery({
    queryKey: queryKeys.coach.parentPermissions(studentId, parentId),
    queryFn: async () => {
      if (!studentId || !parentId) return null;
      return await apiClient.get(`/students/${studentId}/parents/${parentId}/permissions`);
    },
    enabled: !!studentId && !!parentId,
  });
};

export const useUpdateParentPermissions = (studentId, parentId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (flags) => {
      return await apiClient.put(`/students/${studentId}/parents/${parentId}/permissions`, flags);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.parentPermissions(studentId, parentId) });
    },
  });
};

