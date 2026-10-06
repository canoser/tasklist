import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';

// --- Programlar ---
export const usePrograms = () => useQuery({
  queryKey: ['coach', 'programs'],
  queryFn: async () => (await apiClient.get('/programs')) || [],
});

export const useCreateProgram = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/programs', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach', 'programs'] }),
  });
};

// --- Öğretmenler ---
export const useTeachers = (programId) => useQuery({
  queryKey: ['coach', 'program', programId, 'teachers'],
  queryFn: async () => (await apiClient.get(`/programs/${programId}/teachers`)) || [],
  enabled: !!programId,
});

export const useDeactivateTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, teacherId }) => apiClient.delete(`/programs/${programId}/teachers/${teacherId}`),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'teachers'] }),
  });
};

// --- Dersler ---
export const useCourses = (programId) => useQuery({
  queryKey: ['coach', 'program', programId, 'courses'],
  queryFn: async () => (await apiClient.get(`/programs/${programId}/courses`)) || [],
  enabled: !!programId,
});

export const useCreateCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, data }) => apiClient.post(`/programs/${programId}/courses`, data),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'courses'] }),
  });
};

// --- Gruplar ---
export const useGroups = (programId) => useQuery({
  queryKey: ['coach', 'program', programId, 'groups'],
  queryFn: async () => (await apiClient.get(`/programs/${programId}/groups`)) || [],
  enabled: !!programId,
});

export const useCreateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, data }) => apiClient.post(`/programs/${programId}/groups`, data),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'groups'] }),
  });
};

// --- Haftalık Program ---
export const useSchedule = (programId) => useQuery({
  queryKey: ['coach', 'program', programId, 'schedule'],
  queryFn: async () => (await apiClient.get(`/programs/${programId}/schedule`)) || [],
  enabled: !!programId,
});

export const useCreateScheduleSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, data }) => apiClient.post(`/programs/${programId}/schedule`, data),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'schedule'] }),
  });
};

export const useDeleteScheduleSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, slotId }) => apiClient.delete(`/programs/${programId}/schedule/${slotId}`),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'schedule'] }),
  });
};

// --- Kaynaklar ---
export const useCourseResources = (programId, courseId) => useQuery({
  queryKey: ['coach', 'program', programId, 'course', courseId, 'resources'],
  queryFn: async () => (await apiClient.get(`/programs/${programId}/courses/${courseId}/resources`)) || [],
  enabled: !!programId && !!courseId,
});

export const useCreateResource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, courseId, data }) => apiClient.post(`/programs/${programId}/courses/${courseId}/resources`, data),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'course', v.courseId, 'resources'] }),
  });
};

// --- Program koçları (yardımcı yönetimi) ---
export const useProgramCoaches = (programId) => useQuery({
  queryKey: ['coach', 'program', programId, 'coaches'],
  queryFn: async () => (await apiClient.get(`/programs/${programId}/coaches`)) || [],
  enabled: !!programId,
});

export const useAddProgramCoach = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, coachId }) => apiClient.post(`/programs/${programId}/coaches`, { coachId }),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'coaches'] }),
  });
};

export const useRemoveProgramCoach = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, coachId }) => apiClient.delete(`/programs/${programId}/coaches/${coachId}`),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'coaches'] }),
  });
};

export const useTransferAdmin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, coachId }) => apiClient.post(`/programs/${programId}/transfer-admin`, { coachId }),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'coaches'] }),
  });
};

// --- Süper yönetici ---
export const usePendingCoaches = () => useQuery({
  queryKey: ['admin', 'pending-coaches'],
  queryFn: async () => (await apiClient.get('/admin/pending-coaches')) || [],
});

export const useApproveCoach = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ coachId, maxPrograms }) => apiClient.post(`/admin/coaches/${coachId}/approve`, { maxPrograms }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pending-coaches'] }),
  });
};

export const useRejectCoach = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ coachId }) => apiClient.post(`/admin/coaches/${coachId}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pending-coaches'] }),
  });
};

// --- Ders detayı ---
export const useCourseStudents = (programId, courseId) => useQuery({
  queryKey: ['coach', 'program', programId, 'course', courseId, 'students'],
  queryFn: async () => (await apiClient.get(`/programs/${programId}/courses/${courseId}/students`)) || [],
  enabled: !!programId && !!courseId,
});

export const useCourseGroups = (programId, courseId) => useQuery({
  queryKey: ['coach', 'program', programId, 'course', courseId, 'groups'],
  queryFn: async () => (await apiClient.get(`/programs/${programId}/courses/${courseId}/groups`)) || [],
  enabled: !!programId && !!courseId,
});

export const useAddCourseStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, courseId, studentId }) => apiClient.post(`/programs/${programId}/courses/${courseId}/students`, { studentId }),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'course', v.courseId, 'students'] }),
  });
};

export const useRemoveCourseStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, courseId, studentId }) => apiClient.delete(`/programs/${programId}/courses/${courseId}/students/${studentId}`),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'course', v.courseId, 'students'] }),
  });
};

export const useAddCourseGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, courseId, groupId }) => apiClient.post(`/programs/${programId}/courses/${courseId}/groups`, { groupId }),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'course', v.courseId, 'groups'] }),
  });
};

export const useRemoveCourseGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, courseId, groupId }) => apiClient.delete(`/programs/${programId}/courses/${courseId}/groups/${groupId}`),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['coach', 'program', v.programId, 'course', v.courseId, 'groups'] }),
  });
};
