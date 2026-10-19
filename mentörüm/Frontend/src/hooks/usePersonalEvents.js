import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
    },
  });
};

export const usePersonalEvents = () => {
  return useQuery({
    queryKey: ['me', 'events'],
    queryFn: async () => (await apiClient.get('/me/events')) || [],
  });
};

export const useCheckinPersonalEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      return await apiClient.patch(`/me/events/${id}/checkin`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'calendar'] });
    },
  });
};
