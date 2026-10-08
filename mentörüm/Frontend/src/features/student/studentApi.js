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
    mutationFn: async ({ homeworkId, percentage = 100 }) => {
      // Backend'deki endpoint'e POST isteği yapıyoruz.
      const response = await apiClient.post(`/homework/assignments/${homeworkId}/complete`, {
        CompletionPercentage: percentage
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
    onError: (err, homeworkId, context) => {
      // Hata olursa eski haline döndür
      queryClient.setQueryData(['student', 'homework'], context.previousHomework);
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
