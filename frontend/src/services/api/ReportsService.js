import axiosInstance from './axiosconfig';

const BASE = '/super-admin/reports';

export const ReportsService = {
    getMeetings: () => axiosInstance.get(`${BASE}/meetings`).then(r => r.data),
    getAttendance: (meetingId) => axiosInstance.get(`${BASE}/${meetingId}/attendance`).then(r => r.data),
    getPolls: (meetingId) => axiosInstance.get(`${BASE}/${meetingId}/polls`).then(r => r.data),
    getDelegations: (meetingId) => axiosInstance.get(`${BASE}/${meetingId}/delegations`).then(r => r.data),
};