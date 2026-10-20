import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';

export const useUploads = () => useQuery({
    queryKey: ['uploads'],
    queryFn: () => apiClient.get('/uploads/') || [],
});

export const useRecipients = (courseId) => useQuery({
    queryKey: ['uploads', 'recipients', courseId],
    queryFn: () => apiClient.get(`/uploads/recipients?courseId=${courseId}`) || [],
    enabled: !!courseId,
});

export const useStorageUsage = () => useQuery({
    queryKey: ['coach', 'storage-usage'],
    queryFn: () => apiClient.get('/coach/storage-usage') || null,
});

export const useCreateUploadUrl = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => apiClient.post('/uploads/url', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['uploads'] }),
    });
};

export const useConfirmUpload = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (uploadId) => apiClient.post(`/uploads/${uploadId}/confirm`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['uploads'] }),
    });
};

export const useDeliverUpload = () => useMutation({
    mutationFn: ({ uploadId, data }) => apiClient.post(`/uploads/${uploadId}/deliver`, data),
});

export const useDownloadUrl = () => useMutation({
    mutationFn: (uploadId) => apiClient.get(`/uploads/${uploadId}/url`),
});

export const useDevices = () => useQuery({
    queryKey: ['devices'],
    queryFn: () => apiClient.get('/devices') || [],
});

export const useRegisterDevice = () => useMutation({
    mutationFn: (data) => apiClient.post('/devices', data),
});

export const useSetDownloadDevice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (deviceId) => apiClient.put('/users/me/download-device', { deviceId }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
    });
};

export const useUpdateCoachStorage = () => useMutation({
    mutationFn: ({ coachId, data }) => apiClient.put(`/admin/coaches/${coachId}/storage`, data),
});

export const useUpdateTeacherFileSharing = () => useMutation({
    mutationFn: ({ courseId, allowed }) => apiClient.put(`/courses/${courseId}/teacher-file-sharing`, { allowed }),
});
