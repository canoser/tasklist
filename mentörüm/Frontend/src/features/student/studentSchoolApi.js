import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';

export const useStudentSchedule = () => useQuery({
  queryKey: ['student', 'schedule'],
  queryFn: async () => (await apiClient.get('/student/schedule')) || [],
});

export const useStudentCourses = () => useQuery({
  queryKey: ['student', 'courses'],
  queryFn: async () => (await apiClient.get('/student/courses')) || [],
});

export const useStudentCourseResources = (courseId) => useQuery({
  queryKey: ['student', 'course', courseId, 'resources'],
  queryFn: async () => (await apiClient.get(`/student/courses/${courseId}/resources`)) || [],
  enabled: !!courseId,
});

export const useUpdateResourceProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, data }) => apiClient.put(`/student/resources/${resourceId}/progress`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student'] }),
  });
};
