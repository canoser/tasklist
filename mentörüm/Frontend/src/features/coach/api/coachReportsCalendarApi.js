import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/apiClient';
import { queryKeys } from '../../../api/queryKeys';

export const useReportsOverview = () => {
  return useQuery({
    queryKey: queryKeys.coach.reportsOverview(),
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
    queryKey: queryKeys.coach.calendar(startDate, endDate, programId, studentId, courseId, teacherId, eventType),
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

export const useStudentReport = (studentId) => {
  return useQuery({
    queryKey: queryKeys.coach.studentReport(studentId),
    queryFn: async () => {
      if (!studentId) return null;
      return (await apiClient.get(`/reports/students/${studentId}`)) || null;
    },
    enabled: !!studentId,
  });
};

export const useReportsDetail = () => {
  return useQuery({
    queryKey: queryKeys.coach.reportsDetail(),
    queryFn: async () => (await apiClient.get('/reports/detail')) || null,
  });
};

export const useCoachStudentEvents = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentEvents(studentId),
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/events`)) || [];
    },
    enabled: !!studentId && enabled,
  });
};

export const useCoachStudentTimeBudget = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentTimeBudget(studentId),
    queryFn: async () => {
      if (!studentId) return null;
      return await apiClient.get(`/students/${studentId}/time-budget`);
    },
    enabled: !!studentId && enabled,
  });
};

