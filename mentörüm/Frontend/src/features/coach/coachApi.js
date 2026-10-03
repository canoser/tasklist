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
  return useMutation({
    mutationFn: async ({ email, role, relatedId }) => {
      const response = await apiClient.post('/invites/send', { email, role, relatedId });
      return response; // { code, link, expiresAt }
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

export const useSeedCurriculum = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/curriculum/seed');
      return response;
    },
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

export const useCalendarEvents = (startDate, endDate, studentId = null) => {
  return useQuery({
    queryKey: ['coach', 'calendar', startDate, endDate, studentId],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const params = new URLSearchParams({
        from: startDate,
        to: endDate,
      });
      if (studentId) {
        params.append('studentId', studentId);
      }
      const response = await apiClient.get(`/calendar?${params.toString()}`);
      return response || [];
    },
    // Sadece startDate ve endDate varsa çalışsın
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
