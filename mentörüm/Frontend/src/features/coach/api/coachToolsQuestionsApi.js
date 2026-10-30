import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/apiClient';
import { queryKeys } from '../../../api/queryKeys';

export const useCoachStudentTeacherNotes = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentTeacherNotes(studentId),
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/teacher-notes`)) || [];
    },
    enabled: !!studentId && enabled,
  });
};

export const useRecentTeacherNotes = () => {
  return useQuery({
    queryKey: queryKeys.coach.recentTeacherNotes(),
    queryFn: async () => {
      return (await apiClient.get('/students/recent-teacher-notes')) || [];
    },
  });
};

export const useCoachStudentCoachingTools = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentCoachingTools(studentId),
    queryFn: async () => {
      if (!studentId) return null;
      return await apiClient.get(`/students/${studentId}/coaching-tools`);
    },
    enabled: !!studentId && enabled,
  });
};

export const useUpdateCoachingTools = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, data, toolsData }) => {
      const payload = data ?? toolsData ?? {};
      const normalized = {
        swotData: payload.swotData != null && typeof payload.swotData !== 'string' ? JSON.stringify(payload.swotData) : payload.swotData,
        wheelData: payload.wheelData != null && typeof payload.wheelData !== 'string' ? JSON.stringify(payload.wheelData) : payload.wheelData,
        habitsData: payload.habitsData != null && typeof payload.habitsData !== 'string' ? JSON.stringify(payload.habitsData) : payload.habitsData,
      };
      return await apiClient.put(`/students/${studentId}/coaching-tools`, normalized);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.studentCoachingTools(variables.studentId) });
    },
  });
};

export const useReplyStudentQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, questionId, reply, status }) => {
      return await apiClient.patch(`/students/${studentId}/questions/${questionId}`, { reply, status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.studentQuestions(variables.studentId) });
    },
  });
};

export const useCoachStudentQuestions = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentQuestions(studentId),
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/questions`)) || [];
    },
    enabled: !!studentId && enabled,
  });
};

export const useStudentCheckinsForCoach = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentCheckins(studentId),
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/checkins`)) || [];
    },
    enabled: !!studentId && enabled,
  });
};

