import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';

export const useParentChildren = () => {
  return useQuery({
    queryKey: ['parent', 'children'],
    queryFn: async () => {
      const response = await apiClient.get('/parents/my-children');
      return response || [];
    },
  });
};

export const useParentChildDetails = (studentId) => {
  return useQuery({
    queryKey: ['parent', 'child', studentId],
    queryFn: async () => {
      const response = await apiClient.get(`/parents/children/${studentId}`);
      return response || null;
    },
    enabled: !!studentId,
  });
};

export const useParentChildHomework = (studentId) => {
  return useQuery({
    queryKey: ['parent', 'child', studentId, 'homework'],
    queryFn: async () => {
      const response = await apiClient.get(`/homework/children/${studentId}`);
      return response || [];
    },
    enabled: !!studentId,
  });
};
