import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';

export const useStudents = () => {
  return useQuery({
    queryKey: ['coach', 'students'],
    queryFn: async () => {
      const response = await apiClient.get('/students');
      return response || [];
    },
  });
};

export const useSendInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role, relatedId }) => {
      const response = await apiClient.post('/invites/send', { email, role, relatedId });
      return response; // { code, link, expiresAt, directAdded, message }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['coach', 'pending-invites'] });
    },
  });
};

export const usePendingInvites = () => {
  return useQuery({
    queryKey: ['coach', 'pending-invites'],
    queryFn: async () => {
      const response = await apiClient.get('/invites/pending');
      return response || [];
    },
  });
};

export const useLevels = () => {
  return useQuery({
    queryKey: ['curriculum', 'levels'],
    queryFn: async () => {
      const response = await apiClient.get('/curriculum/levels');
      return response || [];
    },
  });
};

export const useSubjects = (level) => {
  return useQuery({
    queryKey: ['curriculum', 'subjects', level],
    queryFn: async () => {
      const qs = level ? `?level=${encodeURIComponent(level)}` : '';
      const response = await apiClient.get(`/curriculum/subjects${qs}`);
      return response || [];
    },
    enabled: !!level,
  });
};

export const useTopics = (subjectId, grade) => {
  return useQuery({
    queryKey: ['curriculum', 'topics', subjectId, grade],
    queryFn: async () => {
      const qs = grade ? `?grade=${encodeURIComponent(grade)}` : '';
      const response = await apiClient.get(`/curriculum/subjects/${subjectId}/topics${qs}`);
      return response || [];
    },
    enabled: !!subjectId,
  });
};

export const useReportsOverview = () => {
  return useQuery({
    queryKey: ['coach', 'reports', 'overview'],
    queryFn: async () => {
      const response = await apiClient.get('/reports/overview');
      return response || null;
    },
  });
};

export const useCalendarEvents = (startDate, endDate, filters = {}) => {
  const filterObj = typeof filters === 'object' && filters !== null ? filters : { studentId: filters };
  const { programId, studentId, courseId, teacherId, eventType } = filterObj;

  return useQuery({
    queryKey: ['coach', 'calendar', startDate, endDate, programId, studentId, courseId, teacherId, eventType],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const params = new URLSearchParams({
        from: startDate,
        to: endDate,
      });
      if (programId) params.append('programId', programId);
      if (studentId) params.append('studentId', studentId);
      if (courseId) params.append('courseId', courseId);
      if (teacherId) params.append('teacherId', teacherId);
      if (eventType && eventType !== 'all') params.append('eventType', eventType);

      const response = await apiClient.get(`/calendar?${params.toString()}`);
      return response || [];
    },
    enabled: !!startDate && !!endDate,
  });
};

export const useStudent = (id) => {
  return useQuery({
    queryKey: ['coach', 'student', id],
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
      queryClient.invalidateQueries({ queryKey: ['coach', 'students'] });
      queryClient.invalidateQueries({ queryKey: ['coach', 'student'] });
    },
  });
};

export const useStudentNotes = (studentId) => {
  return useQuery({
    queryKey: ['coach', 'student', studentId, 'notes'],
    queryFn: async () => {
      const response = await apiClient.get(`/students/${studentId}/notes`);
      return response || [];
    },
    enabled: !!studentId,
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
      // 1. Olası çakışmaları önlemek için devam eden istekleri iptal et
      await queryClient.cancelQueries({ queryKey: ['coach', 'student', studentId] });
      
      // 2. Önceki durumu kaydet (hata durumunda geri dönmek için)
      const previousStudent = queryClient.getQueryData(['coach', 'student', studentId]);
      
      // 3. İyimser güncellemeyi (Optimistic Update) yap
      queryClient.setQueryData(['coach', 'student', studentId], old => {
        if (!old) return old;
        return { ...old, coachNotes: notes };
      });
      
      // 4. Bağlamı (context) döndür
      return { previousStudent };
    },
    onError: (err, variables, context) => {
      // 5. Hata olursa önceki duruma geri dön
      if (context?.previousStudent) {
        queryClient.setQueryData(['coach', 'student', variables.studentId], context.previousStudent);
      }
    },
    onSettled: (data, error, variables) => {
      // 6. Başarı veya hata fark etmeksizin, veriyi arka planda yenile
      queryClient.invalidateQueries({ queryKey: ['coach', 'student', variables.studentId] });
    }
  });
};

export const useAssignHomework = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (homeworkData) => {
      const response = await apiClient.post('/homework/assignments', homeworkData);
      return response;
    },
    onMutate: async (homeworkData) => {
      await queryClient.cancelQueries({ queryKey: ['coach', 'calendar'] });
      // Yeni ödev eklendiğinde takvim ve ilgili öğrencinin ödev listeleri etkileneceği için
      // kapsamlı bir invalidate yapmadan önce sadece toast göstermek için kullanılabilir
      // Ya da genel bir "loading" state gösterilir.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['coach', 'students'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'calendar'] });
    }
  });
};

export const useAddExamResult = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ studentId, examData }) => {
      // Backend POST /exams endpoint expects studentId in the body
      const response = await apiClient.post('/exams', { ...examData, studentId });
      return response;
    },
    onMutate: async ({ studentId, examData }) => {
      await queryClient.cancelQueries({ queryKey: ['coach', 'student', studentId] });
      const previousStudent = queryClient.getQueryData(['coach', 'student', studentId]);
      
      queryClient.setQueryData(['coach', 'student', studentId], old => {
        if (!old) return old;
        return {
          ...old,
          examResults: [...(old.examResults || []), { id: `temp-${Date.now()}`, ...examData }]
        };
      });
      return { previousStudent };
    },
    onError: (err, variables, context) => {
      if (context?.previousStudent) {
        queryClient.setQueryData(['coach', 'student', variables.studentId], context.previousStudent);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'student', variables.studentId] });
    }
  });
};

export const useCoachStudentHomework = (studentId) => {
  return useQuery({
    queryKey: ['coach', 'student', studentId, 'homework'],
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/homework/student/${studentId}`)) || [];
    },
    enabled: !!studentId,
  });
};

export const useCoachStudentCurriculum = (studentId) => {
  return useQuery({
    queryKey: ['coach', 'student', studentId, 'curriculum'],
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/curriculum`)) || [];
    },
    enabled: !!studentId,
  });
};

export const useUpdateCoachProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return await apiClient.patch('/me/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

export const useStudentReport = (studentId) => {
  return useQuery({
    queryKey: ['coach', 'reports', 'student', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      return (await apiClient.get(`/reports/students/${studentId}`)) || null;
    },
    enabled: !!studentId,
  });
};

export const useReportsDetail = () => {
  return useQuery({
    queryKey: ['coach', 'reports', 'detail'],
    queryFn: async () => (await apiClient.get('/reports/detail')) || null,
  });
};

export const useCoachStudentEvents = (studentId) => {
  return useQuery({
    queryKey: ['coach', 'student', studentId, 'events'],
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/events`)) || [];
    },
    enabled: !!studentId,
  });
};

export const useCoachStudentSessions = (studentId) => {
  return useQuery({
    queryKey: ['coach', 'student', studentId, 'sessions'],
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/sessions`)) || [];
    },
    enabled: !!studentId,
  });
};

export const useCreateCoachingSession = (studentId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return await apiClient.post(`/students/${studentId}/sessions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'student', studentId, 'sessions'] });
    },
  });
};

export const useCompleteHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, studentNotes = 'Koç tarafından onaylandı.' }) => {
      return await apiClient.post(`/homework/assignments/${assignmentId}/complete`, { studentNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['coach', 'reports'] });
    },
  });
};

// T34: Onay Merkezi Hook'ları
export const useApprovals = (programId, status) => {
  return useQuery({
    queryKey: ['coach', 'approvals', programId || 'all', status],
    queryFn: async () => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const url = programId ? `/programs/${programId}/approvals${qs}` : `/approvals${qs}`;
      return (await apiClient.get(url)) || [];
    },
  });
};

export const useApproveItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await apiClient.post(`/approvals/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'approvals'] });
    },
  });
};

export const useRejectItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      return await apiClient.post(`/approvals/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'approvals'] });
    },
  });
};

// T36: Veli Yetkileri Hook'ları
export const useParentPermissions = (studentId, parentId) => {
  return useQuery({
    queryKey: ['coach', 'student', studentId, 'parent', parentId, 'permissions'],
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
      queryClient.invalidateQueries({ queryKey: ['coach', 'student', studentId, 'parent', parentId, 'permissions'] });
    },
  });
};

// T55: Koç için Öğretmen Notları
export const useStudentTeacherNotes = (studentId) => {
  return useQuery({
    queryKey: ['coach', 'student', studentId, 'teacher-notes'],
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/teacher-notes`)) || [];
    },
    enabled: !!studentId,
  });
};

// T43: Konu İstatistikleri & Zaman Bütçesi
export const useStudentSubjectStats = (studentId) => {
  return useQuery({
    queryKey: ['coach', 'student', studentId, 'subject-stats'],
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/subject-stats`)) || [];
    },
    enabled: !!studentId,
  });
};

export const useStudentTimeBudget = (studentId) => {
  return useQuery({
    queryKey: ['coach', 'student', studentId, 'time-budget'],
    queryFn: async () => {
      if (!studentId) return null;
      return await apiClient.get(`/students/${studentId}/time-budget`);
    },
    enabled: !!studentId,
  });
};

// Finans & Ödeme Planları
export const usePaymentPlans = (programId) => {
  return useQuery({
    queryKey: ['coach', 'payment-plans', programId || 'all'],
    queryFn: async () => {
      const url = programId ? `/programs/${programId}/payment-plans` : '/payment-plans';
      return (await apiClient.get(url)) || [];
    },
  });
};

export const useCreatePaymentPlan = (programId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const pid = payload.programId || programId;
      return await apiClient.post(`/programs/${pid}/payment-plans`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'payment-plans'] });
    },
  });
};

export const useCollectPayment = (programId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, amount, method, receiptUrl }) => {
      return await apiClient.post(`/payment-items/${itemId}/collect`, { amount, method, receiptUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['coach', 'calendar'] });
    },
  });
};

export const useRecentTeacherNotes = () => {
  return useQuery({
    queryKey: ['coach', 'recent-teacher-notes'],
    queryFn: async () => {
      return (await apiClient.get('/students/recent-teacher-notes')) || [];
    },
  });
};

