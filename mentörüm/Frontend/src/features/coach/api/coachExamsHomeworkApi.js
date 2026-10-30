import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/apiClient';
import { queryKeys } from '../../../api/queryKeys';

export const useLevels = () => {
  return useQuery({
    queryKey: queryKeys.curriculum.levels(),
    queryFn: async () => {
      const response = await apiClient.get('/curriculum/levels');
      return response || [];
    },
  });
};

export const useSubjects = (level) => {
  return useQuery({
    queryKey: queryKeys.curriculum.subjects(level),
    queryFn: async () => {
      const qs = level ? `?level=${encodeURIComponent(level)}` : '';
      const response = await apiClient.get(`/curriculum/subjects${qs}`);
      return response || [];
    },
    enabled: !!level,
  });
};

export const useUnits = (subjectId, grade) => {
  return useQuery({
    queryKey: queryKeys.curriculum.units(subjectId, grade),
    queryFn: async () => {
      const qs = grade ? `?grade=${encodeURIComponent(grade)}` : '';
      const response = await apiClient.get(`/curriculum/subjects/${subjectId}/units${qs}`);
      return response || [];
    },
    enabled: !!subjectId,
  });
};

export const useTopics = (subjectId, grade, unit) => {
  return useQuery({
    queryKey: queryKeys.curriculum.topics(subjectId, grade, unit),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (grade) params.append('grade', grade);
      if (unit) params.append('unit', unit);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get(`/curriculum/subjects/${subjectId}/topics${qs}`);
      return response || [];
    },
    enabled: !!subjectId,
  });
};

export const useAssignHomework = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (homeworkData) => {
      const response = await apiClient.post('/homework/assignments', homeworkData);
      return response;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.coach.calendarAll() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.calendarAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.students() });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.calendarAll() });
    },
  });
};

export const useAddExamResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, examData }) => {
      const response = await apiClient.post('/exams', { ...examData, studentId });
      return response;
    },
    onMutate: async ({ studentId, examData }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.coach.student(studentId) });
      const previousStudent = queryClient.getQueryData(queryKeys.coach.student(studentId));

      queryClient.setQueryData(queryKeys.coach.student(studentId), (old) => {
        if (!old) return old;
        return {
          ...old,
          examResults: [...(old.examResults || []), { id: `temp-${Date.now()}`, ...examData }],
        };
      });
      return { previousStudent };
    },
    onError: (err, variables, context) => {
      if (context?.previousStudent) {
        queryClient.setQueryData(queryKeys.coach.student(variables.studentId), context.previousStudent);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.student(variables.studentId) });
    },
  });
};

export const useCoachStudentHomework = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentHomework(studentId),
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/homework/student/${studentId}`)) || [];
    },
    enabled: !!studentId && enabled,
  });
};

export const useCoachStudentCurriculum = (studentId, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.coach.studentCurriculum(studentId),
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/students/${studentId}/curriculum`)) || [];
    },
    enabled: !!studentId && enabled,
  });
};

export const useCoachCompleteHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, studentNotes = 'Koç tarafından onaylandı.' }) => {
      return await apiClient.post(`/homework/assignments/${assignmentId}/complete`, {
        note: studentNotes,
        completionPercentage: 100,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.calendarAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.reportsAll() });
    },
  });
};

