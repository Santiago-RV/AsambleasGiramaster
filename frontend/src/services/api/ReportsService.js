import axiosInstance from './axiosconfig';

const BASE_SUPER_ADMIN = '/super-admin/reports';
const BASE_ADMIN = '/administrator';

export const ReportsService = {
    getMeetings: () => axiosInstance.get(`${BASE_SUPER_ADMIN}/meetings`).then(r => r.data),
    
    getAttendance: (meetingId) => axiosInstance.get(`${BASE_SUPER_ADMIN}/${meetingId}/attendance`).then(r => r.data),
    
    getPolls: (meetingId) => axiosInstance.get(`${BASE_SUPER_ADMIN}/${meetingId}/polls`).then(r => r.data),
    
    getDelegations: (meetingId) => axiosInstance.get(`${BASE_SUPER_ADMIN}/${meetingId}/delegations`).then(r => r.data),

    getAttendanceReport: (meetingId) => axiosInstance.get(`${BASE_ADMIN}/meetings/${meetingId}/report/attendance`).then(r => r.data),
    
    getQuorumReport: (meetingId) => axiosInstance.get(`${BASE_ADMIN}/meetings/${meetingId}/report/quorum`).then(r => r.data),
    
    getPollsReport: (meetingId) => axiosInstance.get(`${BASE_ADMIN}/meetings/${meetingId}/report/polls`).then(r => r.data),
    
    getDelegationsReport: (meetingId) => axiosInstance.get(`${BASE_ADMIN}/meetings/${meetingId}/report/delegations`).then(r => r.data),
};
