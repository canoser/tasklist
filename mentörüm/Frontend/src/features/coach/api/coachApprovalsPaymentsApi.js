import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/apiClient';
import { queryKeys } from '../../../api/queryKeys';

export const useApprovals = (programId, status) => {
  return useQuery({
    queryKey: queryKeys.coach.approvals(programId, status),
    queryFn: async () => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const url = programId ? `/programs/${programId}/approvals${qs}` : `/approvals${qs}`;
      return (await apiClient.get(url)) || [];
    },
  });
};

export const useApproveItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await apiClient.post(`/approvals/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.approvalsAll() });
    },
  });
};

export const useRejectItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      return await apiClient.post(`/approvals/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.approvalsAll() });
    },
  });
};

export const usePaymentPlans = (programId) => {
  return useQuery({
    queryKey: queryKeys.coach.paymentPlans(programId),
    queryFn: async () => {
      const url = programId ? `/programs/${programId}/payment-plans` : '/payment-plans';
      return (await apiClient.get(url)) || [];
    },
  });
};

export const useCreatePaymentPlan = (programId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const pid = payload.programId || programId;
      return await apiClient.post(`/programs/${pid}/payment-plans`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.paymentPlansAll() });
    },
  });
};

export const useCollectPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, amount, method, receiptUrl }) => {
      return await apiClient.post(`/payment-items/${itemId}/collect`, { amount, method, receiptUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.paymentPlansAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.coach.calendarAll() });
    },
  });
};

