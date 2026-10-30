import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';

export const useStudentHomework = () => {
  return useQuery({
    queryKey: ['student', 'homework'],
    queryFn: async () => {
      const response = await apiClient.get('/homework/me');
      return response || [];
    },
  });
};

export const useCompleteHomework = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ homeworkId, percentage = 100, note = null, attachmentIds = null, expectedVersion = 1 }) => {
      // Backend'deki endpoint'e POST isteği yapıyoruz (V15: ExpectedVersion eklendi).
      const response = await apiClient.post(`/homework/assignments/${homeworkId}/complete`, {
        CompletionPercentage: percentage,
        Note: note,
        AttachmentIds: attachmentIds,
        ExpectedVersion: expectedVersion
      });
      return response;
    },
    // Optimistic Update: API isteği başarılı olmadan önce UI'ı anında güncelleriz.
    onMutate: async ({ homeworkId, percentage = 100 }) => {
      // Önceki işlemi iptal et ki çakışma olmasın
      await queryClient.cancelQueries({ queryKey: ['student', 'homework'] });

      // Önceki durumu yedekle (rollback için)
      const previousHomework = queryClient.getQueryData(['student', 'homework']);

      // Yeni durumu cache'e yaz (optimistic)
      queryClient.setQueryData(['student', 'homework'], (old) => {
        if (!old) return [];
        return old.map(hw => 
          hw.id === homeworkId ? { 
            ...hw, 
            status: percentage === 100 ? 'DONE' : 'PENDING', 
            completionPercentage: percentage,
            completedAt: percentage === 100 ? new Date().toISOString() : hw.completedAt 
          } : hw
        );
      });

      // Rollback fonksiyonu döndür
      return { previousHomework };
    },
    onError: (err, variables, context) => {
      // Hata olursa eski haline döndür
      if (context?.previousHomework) {
        queryClient.setQueryData(['student', 'homework'], context.previousHomework);
      }
      if (err?.response?.status === 409 || err?.response?.data?.code === 'CONCURRENCY_CONFLICT') {
        alert('Bu ödev başka bir sekmede veya öğretmeniniz tarafından güncellendi. Sayfa yenileniyor...');
      }
    },
    onSettled: () => {
      // İşlem bitince (başarılı/başarısız) sunucudan en güncel veriyi tekrar çek
      queryClient.invalidateQueries({ queryKey: ['student', 'homework'] });
    },
  });
};

export const useStudentProfile = () => useQuery({
  queryKey: ['student', 'profile'],
  queryFn: async () => (await apiClient.get('/student/profile')) || null,
});

export const useStudentExams = () => useQuery({
  queryKey: ['student', 'exams'],
  queryFn: async () => (await apiClient.get('/student/exams')) || [],
});

export const useStudentCurriculum = () => useQuery({
  queryKey: ['student', 'curriculum'],
  queryFn: async () => (await apiClient.get('/student/curriculum')) || [],
});

export const useStudentGoal = () => useQuery({
  queryKey: ['student', 'goal'],
  queryFn: async () => (await apiClient.get('/student/goal')) || null,
});

export const useUpdateStudentGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.put('/student/goal', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'goal'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'profile'] });
    },
  });
};

export const useStudentCalendar = (startDate, endDate) => {
  return useQuery({
    queryKey: ['student', 'calendar', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const params = new URLSearchParams({ from: startDate, to: endDate });
      return (await apiClient.get(`/me/calendar?${params.toString()}`)) || [];
    },
    enabled: !!startDate && !!endDate,
  });
};

export const useStudentSessions = () => {
  return useQuery({
    queryKey: ['student', 'sessions'],
    queryFn: async () => (await apiClient.get('/student/sessions')) || [],
  });
};

export const useUpdateSessionPrep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, prepNotes }) => {
      return await apiClient.patch(`/student/sessions/${sessionId}/prep`, { prepNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'sessions'] });
    },
  });
};

export const useCreateStudySession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return await apiClient.post('/student/study-sessions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'study-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'subject-stats'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'time-budget'] });
    },
  });
};

export const useStudentSubjectStats = () => {
  return useQuery({
    queryKey: ['student', 'subject-stats'],
    queryFn: async () => (await apiClient.get('/student/subject-stats')) || [],
  });
};

export const useStudentTimeBudget = () => {
  return useQuery({
    queryKey: ['student', 'time-budget'],
    queryFn: async () => await apiClient.get('/student/time-budget'),
  });
};

export const useStudentTeacherNotes = () => {
  return useQuery({
    queryKey: ['student', 'teacher-notes'],
    queryFn: async () => (await apiClient.get('/student/teacher-notes')) || [],
  });
};

// V10: Günlük Durum (Mood Check-in)
export const useStudentCheckins = () => {
  return useQuery({
    queryKey: ['student', 'checkins'],
    queryFn: async () => (await apiClient.get('/student/checkins')) || [],
  });
};

export const useSaveCheckin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.put('/student/checkin', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', 'checkins'] }),
  });
};

// V10: Kişisel Notlar
export const useStudentNotes = () => {
  return useQuery({
    queryKey: ['student', 'notes'],
    queryFn: async () => (await apiClient.get('/student/notes')) || [],
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/student/notes', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', 'notes'] }),
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => apiClient.put(`/student/notes/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', 'notes'] }),
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.delete(`/student/notes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', 'notes'] }),
  });
};

// V10: Takıldığım Konular (Sorulacaklar)
export const useStudentQuestions = () => {
  return useQuery({
    queryKey: ['student', 'questions'],
    queryFn: async () => (await apiClient.get('/student/questions')) || [],
  });
};

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/student/questions', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', 'questions'] }),
  });
};

export const useResolveQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.patch(`/student/questions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student', 'questions'] }),
  });
};

// V10: Streak
export const useStudentStreak = () => {
  return useQuery({
    queryKey: ['student', 'streak'],
    queryFn: async () => (await apiClient.get('/student/streak')) || { currentStreak: 0, totalStudyDays: 0 },
  });
};

// V10: Okul Haftalık Şablonu
export const useStudentSchoolSchedule = () => {
  return useQuery({
    queryKey: ['student', 'school-schedule'],
    queryFn: async () => (await apiClient.get('/student/school-schedule')) || [],
  });
};

export const useCreateSchoolSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/student/school-schedule', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'school-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'calendar'] });
    },
  });
};

export const useDeleteSchoolSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.delete(`/student/school-schedule/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'school-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'calendar'] });
    },
  });
};

// V10: Ödev Ek Süre Talebi
export const useRequestExtension = () => {
  return useMutation({
    mutationFn: ({ homeworkId, data }) => apiClient.post(`/homework/${homeworkId}/request-extension`, data),
  });
};

// V16: Öğrenci Koçluk Araçları (Yalnızca Alışkanlıklar & OKR Hedefleri)
export const useStudentCoachingTools = () => {
  return useQuery({
    queryKey: ['student', 'coaching-tools'],
    queryFn: async () => (await apiClient.get('/student/coaching-tools')) || { habitsData: '[]' },
  });
};

export const useToggleStudentHabit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.patch('/student/coaching-tools/habits', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'coaching-tools'] });
    },
  });
};

// V16: Öğrenciye Ait Yüklemeler / Dosyalar
export const useStudentUploads = () => {
  return useQuery({
    queryKey: ['student', 'uploads'],
    queryFn: async () => (await apiClient.get('/uploads')) || [],
  });
};
