import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/apiClient';

export const useCreatePersonalEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      return await apiClient.post('/me/events', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'calendar'] });
    },
  });
};
