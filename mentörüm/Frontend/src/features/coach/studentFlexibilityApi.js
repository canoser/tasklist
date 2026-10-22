import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';

// V13: Öğrenci ekleme esnekliği & bireysel/grup geçişi.

export const useCreateStudent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => apiClient.post('/students', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['coach', 'students'] }),
    });
};

export const useInviteStudent = (programId) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ studentId, email }) => apiClient.post(`/programs/${programId}/students/${studentId}/invite`, { email }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['coach', 'students'] }),
    });
};

export const useMoveToGroup = (programId) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ studentId, groupId }) => apiClient.post(`/programs/${programId}/students/${studentId}/move-to-group`, { groupId }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['coach', 'students'] }),
    });
};

export const useMoveToIndividual = (programId) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (studentId) => apiClient.post(`/programs/${programId}/students/${studentId}/move-to-individual`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['coach', 'students'] }),
    });
};
