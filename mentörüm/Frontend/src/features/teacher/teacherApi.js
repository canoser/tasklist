import { useQuery } from '@tanstack/react-query';
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
