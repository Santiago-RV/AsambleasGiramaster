import { publicAxios } from "./axiosconfig";

export class AuthService{
    static async login(credentials){
        if (!credentials.username || !credentials.password) {
            throw new Error('Usuario y contraseña son requeridos');
        }

        const formData = new FormData();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);

        try {
            const response = await publicAxios.post('/auth/login', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 10000,
            });

            if (!response.data || !response.data.access_token) {
                throw new Error(response.data?.message || 'Error al iniciar sesión');
            }

            const { access_token, user } = response.data;

            localStorage.setItem('access_token', access_token);

            if (user && user.username && user.role) {
                const userData = {
                    username: user.username,
                    role: user.role,
                }

                localStorage.setItem('user', JSON.stringify(userData));
            }

            return {
                success: true,
                data: {
                    username: user?.username,
                    role: user?.role,
                }
            };
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Error al iniciar sesión';
            throw new Error(errorMessage);
        }
    } 

    static logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
    }

    static isAuthenticated() {
        return !!localStorage.getItem('access_token');
    }

    static getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
}