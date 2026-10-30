import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '../../api/apiClient';
import { compressImage } from '../../utils/imageCompressor';

export const useUploads = () => useQuery({
    queryKey: ['uploads'],
    queryFn: () => apiClient.get('/uploads/') || [],
});

export const useRecipients = (courseId) => useQuery({
    queryKey: ['uploads', 'recipients', courseId],
    queryFn: () => apiClient.get(`/uploads/recipients?courseId=${courseId}`) || [],
    enabled: !!courseId,
});

export const useStorageUsage = (enabled = true) => useQuery({
    queryKey: ['coach', 'storage-usage'],
    queryFn: () => apiClient.get('/coach/storage-usage') || null,
    enabled,
});

export const useCreateUploadUrl = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ fileName, fileSizeInBytes, contentType, programId, courseId, recipientUserId, homeworkId }) =>
            apiClient.post('/uploads/url', {
                fileName,
                fileSizeInBytes,
                contentType,
                programId,
                courseId,
                recipientUserId,
                homeworkId,
            }),
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

export const useDownloadUrl = () => useMutation({
    mutationFn: (uploadId) => apiClient.get(`/uploads/${uploadId}/url`),
});

export const useUploadFile = () => {
    const createUpload = useCreateUploadUrl();
    const confirmUpload = useConfirmUpload();
    return useMutation({
        mutationFn: async ({ file, programId, courseId, recipientUserId, homeworkId }) => {
            const compressed = await compressImage(file);
            const res = await createUpload.mutateAsync({
                fileName: compressed.name,
                fileSizeInBytes: compressed.size,
                contentType: compressed.type,
                programId,
                courseId,
                recipientUserId,
                homeworkId,
            });
            await axios.put(res.uploadUrl, compressed, { headers: { 'Content-Type': compressed.type } });
            await confirmUpload.mutateAsync(res.uploadId);
            return { uploadId: res.uploadId, fileName: compressed.name };
        },
    });
};

export const useOpenUpload = () => {
    const download = useDownloadUrl();
    const openUpload = async (itemOrUploadId) => {
        if (!itemOrUploadId) return;
        const directUrl = typeof itemOrUploadId === 'object' ? itemOrUploadId.url : null;
        if (directUrl) {
            window.open(directUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        const uploadId = typeof itemOrUploadId === 'object'
            ? (itemOrUploadId.uploadId || itemOrUploadId.id)
            : itemOrUploadId;
        if (!uploadId) return;
        try {
            const res = await download.mutateAsync(uploadId);
            if (res?.url) {
                window.open(res.url, '_blank', 'noopener,noreferrer');
            }
        } catch {
            alert('Dosya açılamadı.');
        }
    };
    return { openUpload, isPending: download.isPending };
};

export const useDevices = () => useQuery({
    queryKey: ['devices'],
    queryFn: () => apiClient.get('/devices') || [],
});

export const useRegisterDevice = () => useMutation({
    mutationFn: ({ deviceUid, platform, label }) =>
        apiClient.post('/devices', { deviceUid, platform, label }),
});

export const useSetDownloadDevice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (deviceId) => apiClient.put('/users/me/download-device', { deviceId }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
    });
};
