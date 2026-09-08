import apiClient from './apiClient';

const COACHING_API_BASE = '/api';

export const getMyStudents = async () => {
    const response = await apiClient.get(`${COACHING_API_BASE}/students`);
    return response.data;
};

export const getStudent = async (id) => {
    const response = await apiClient.get(`${COACHING_API_BASE}/students/${id}`);
    return response.data;
};

export const createStudent = async (data) => {
    const response = await apiClient.post(`${COACHING_API_BASE}/students`, data);
    return response.data;
};

export const getStudentExams = async (studentId, type = null) => {
    const response = await apiClient.get(`${COACHING_API_BASE}/exams/student/${studentId}${type ? `?examType=${type}` : ''}`);
    return response.data;
};

export const createExam = async (data) => {
    const response = await apiClient.post(`${COACHING_API_BASE}/exams`, data);
    return response.data;
};

export const getMyPayments = async (status = null) => {
    const response = await apiClient.get(`${COACHING_API_BASE}/payments${status ? `?status=${status}` : ''}`);
    return response.data;
};

export const createPayment = async (data) => {
    const response = await apiClient.post(`${COACHING_API_BASE}/payments`, data);
    return response.data;
};

export const getMySharedLinks = async () => {
    const response = await apiClient.get(`${COACHING_API_BASE}/sharedlinks`);
    return response.data;
};

export const createSharedLink = async (data) => {
    const response = await apiClient.post(`${COACHING_API_BASE}/sharedlinks`, data);
    return response.data;
};

export const getCoachDashboard = async () => {
    const response = await apiClient.get(`${COACHING_API_BASE}/coach/dashboard`);
    return response.data;
};

export const getStudentStatsSummary = async (studentId) => {
    const response = await apiClient.get(`${COACHING_API_BASE}/student-stats/${studentId}/summary`);
    return response.data;
};

export const getWeeklySchedule = async (studentId) => {
    const response = await apiClient.get(`${COACHING_API_BASE}/weekly-schedule/${studentId}`);
    return response.data;
};

export const saveWeeklySchedule = async (studentId, blocks) => {
    const response = await apiClient.put(`${COACHING_API_BASE}/weekly-schedule/${studentId}`, blocks);
    return response.data;
};

export const getWeeklyScheduleHistory = async (studentId) => {
    const response = await apiClient.get(`${COACHING_API_BASE}/weekly-schedule/${studentId}/history`);
    return response.data;
};

export const authSharedLink = async (token, pin) => {
    const response = await apiClient.post(`${COACHING_API_BASE}/sharedview/auth/${token}`, pin, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
};

export const getSharedLinkData = async (token, pin) => {
    const response = await apiClient.get(`${COACHING_API_BASE}/sharedview/data/${token}`, {
        headers: { 'X-Pin': pin }
    });
    return response.data;
};
