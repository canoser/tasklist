import { useQuery, useMutation } from '@tanstack/react-query';
import { create } from 'zustand';
import { apiClient } from '../../api/apiClient';

export const useParentChildStore = create((set) => ({
  selectedChildId: null,
  setSelectedChildId: (id) => set({ selectedChildId: id }),
}));

export const useParentChildren = () => {
  return useQuery({
    queryKey: ['parent', 'children'],
    queryFn: async () => {
      const response = await apiClient.get('/parents/my-children');
      return response || [];
    },
  });
};

export const useActiveParentChild = () => {
  const { data: children = [], isLoading } = useParentChildren();
  const { selectedChildId, setSelectedChildId } = useParentChildStore();
  const activeChild = children.find((c) => c.studentId === selectedChildId) || children[0] || null;
  return {
    children,
    isChildrenLoading: isLoading,
    student: activeChild,
    selectedChildId: activeChild?.studentId || null,
    setSelectedChildId,
  };
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

export const useParentChildExams = (studentId) => {
  return useQuery({
    queryKey: ['parent', 'child', studentId, 'exams'],
    queryFn: async () => {
      const response = await apiClient.get(`/parents/children/${studentId}/exams`);
      return response || [];
    },
    enabled: !!studentId,
  });
};

export const useParentChildCalendar = (studentId, startDate, endDate) => {
  return useQuery({
    queryKey: ['parent', 'child', studentId, 'calendar', startDate, endDate],
    queryFn: async () => {
      if (!studentId || !startDate || !endDate) return [];
      const params = new URLSearchParams({ from: startDate, to: endDate });
      return (await apiClient.get(`/me/children/${studentId}/calendar?${params.toString()}`)) || [];
    },
    enabled: !!studentId && !!startDate && !!endDate,
  });
};

export const useParentChildPayments = (studentId) => {
  return useQuery({
    queryKey: ['parent', 'child', studentId, 'payments'],
    queryFn: async () => {
      if (!studentId) return null;
      return await apiClient.get(`/parents/children/${studentId}/payments`);
    },
    enabled: !!studentId,
    refetchInterval: 10000, // T49: 10 sn polling
  });
};

export const useCreatePaymentClaim = () => {
  return useMutation({
    mutationFn: async ({ studentId, data: { itemId, amount, receiptUrl, notes } }) => {
      return await apiClient.post(`/parents/children/${studentId}/payment-claims`, {
        itemId,
        amount,
        receiptUrl,
        notes,
      });
    },
  });
};

export const useParentStudyStats = (studentId) => {
  return useQuery({
    queryKey: ['parent', 'child', studentId, 'study-stats'],
    queryFn: async () => {
      if (!studentId) return null;
      return await apiClient.get(`/parents/children/${studentId}/study-stats`);
    },
    enabled: !!studentId,
  });
};

export const useParentTeacherNotes = (studentId) => {
  return useQuery({
    queryKey: ['parent', 'child', studentId, 'teacher-notes'],
    queryFn: async () => {
      if (!studentId) return [];
      return (await apiClient.get(`/parents/children/${studentId}/teacher-notes`)) || [];
    },
    enabled: !!studentId,
  });
};
