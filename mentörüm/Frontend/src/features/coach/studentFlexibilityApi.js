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
        onSuccess: (_, v) => {
            qc.invalidateQueries({ queryKey: ['coach', 'students'] });
            qc.invalidateQueries({ queryKey: ['coach', 'program', programId, 'groups'] });
            qc.invalidateQueries({ queryKey: ['coach', 'program', programId, 'group'] });
            qc.invalidateQueries({ queryKey: ['coach', 'student', v.studentId ?? v] });
        },
    });
};

export const useMoveToIndividual = (programId) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (studentId) => apiClient.post(`/programs/${programId}/students/${studentId}/move-to-individual`),
        onSuccess: (_, v) => {
            qc.invalidateQueries({ queryKey: ['coach', 'students'] });
            qc.invalidateQueries({ queryKey: ['coach', 'program', programId, 'groups'] });
            qc.invalidateQueries({ queryKey: ['coach', 'program', programId, 'group'] });
            qc.invalidateQueries({ queryKey: ['coach', 'student', v.studentId ?? v] });
        },
    });
};

export const useUpdateStudent = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ studentId, data }) => apiClient.put(`/students/${studentId}`, data),
        onSuccess: (_, v) => {
            qc.invalidateQueries({ queryKey: ['coach', 'students'] });
            qc.invalidateQueries({ queryKey: ['coach', 'student', v.studentId] });
        },
    });
};
