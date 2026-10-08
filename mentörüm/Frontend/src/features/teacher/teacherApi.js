import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';

export const useTeacherCourses = () => {
  return useQuery({
    queryKey: ['teacher', 'courses'],
    queryFn: async () => {
      const response = await apiClient.get('/teacher/courses');
      return response || [];
    },
  });
};

export const useTeacherCourseStudents = (courseId) => {
  return useQuery({
    queryKey: ['teacher', 'course', courseId, 'students'],
    queryFn: async () => {
      const response = await apiClient.get(`/teacher/courses/${courseId}/students`);
      return response || [];
    },
    enabled: !!courseId,
  });
};

export const useTeacherCourseHomework = (courseId) => {
  return useQuery({
    queryKey: ['teacher', 'course', courseId, 'homework'],
    queryFn: async () => {
      const response = await apiClient.get(`/teacher/courses/${courseId}/homework`);
      return response || [];
    },
    enabled: !!courseId,
  });
};

export const useTeacherCourseExams = (courseId) => {
  return useQuery({
    queryKey: ['teacher', 'course', courseId, 'exams'],
    queryFn: async () => {
      const response = await apiClient.get(`/teacher/courses/${courseId}/exams`);
      return response || [];
    },
    enabled: !!courseId,
  });
};

export const useTeacherSchedule = () => {
  return useQuery({
    queryKey: ['teacher', 'schedule'],
    queryFn: async () => {
      const response = await apiClient.get('/teacher/schedule');
      return response || [];
    },
  });
};

export const useTeacherProfile = () => {
  return useQuery({
    queryKey: ['teacher', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/teacher/me');
      return response || null;
    },
  });
};

export const useCreateTeacherHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, data }) => apiClient.post(`/teacher/courses/${courseId}/homework`, data),
    onSuccess: (_, v) => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', v.courseId] }),
  });
};

export const useCreateTeacherExam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, data }) => apiClient.post(`/teacher/courses/${courseId}/exams`, data),
    onSuccess: (_, v) => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', v.courseId] }),
  });
};
