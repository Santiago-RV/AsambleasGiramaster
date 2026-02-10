import axiosInstance from './axiosconfig';

class SystemConfigService {
    /**
     * Verifica si existen credenciales de Zoom configuradas
     */
    static async checkZoomConfigStatus() {
        try {
            const response = await axiosInstance.get('/system-config/zoom/status');
            return response.data;
        } catch (error) {
            console.error('Error al verificar estado de configuración:', error);
            throw error;
        }
    }

    /**
     * Obtiene la configuración actual de Zoom (valores enmascarados)
     */
    static async getZoomConfig() {
        try {
            const response = await axiosInstance.get('/system-config/zoom');
            return response.data;
        } catch (error) {
            console.error('Error al obtener configuración de Zoom:', error);
            throw error;
        }
    }

    /**
     * Actualiza las credenciales de Zoom
     * @param {Object} credentials 
     * @param {string} credentials.sdk_key
     * @param {string} credentials.sdk_secret
     * @param {string} credentials.account_id
     * @param {string} credentials.client_id
     * @param {string} credentials.client_secret
     */
    static async updateZoomConfig(credentials) {
        try {
            const response = await axiosInstance.put('/system-config/zoom', credentials);
            return response.data;
        } catch (error) {
            console.error('Error al actualizar configuración de Zoom:', error);
            throw error;
        }
    }

    /**
     * Prueba la conexión con Zoom usando las credenciales actuales
     */
    static async testZoomConnection() {
        try {
            const response = await axiosInstance.post('/system-config/zoom/test', {}, {
                timeout: 15000 // 15 segundos
            });
            return response.data;
        } catch (error) {
            console.error('Error al probar conexión con Zoom:', error);
            throw error;
        }
    }

    // ============================================
    // SMTP Configuration Methods
    // ============================================

    /**
     * Verifica si existen credenciales SMTP configuradas
     */
    static async checkSMTPConfigStatus() {
        try {
            const response = await axiosInstance.get('/system-config/smtp/status');
            return response.data;
        } catch (error) {
            console.error('Error al verificar estado de configuración SMTP:', error);
            throw error;
        }
    }

    /**
     * Obtiene la configuración actual de SMTP (valores enmascarados)
     */
    static async getSMTPConfig() {
        try {
            const response = await axiosInstance.get('/system-config/smtp');
            return response.data;
        } catch (error) {
            console.error('Error al obtener configuración SMTP:', error);
            throw error;
        }
    }

    /**
     * Actualiza las credenciales SMTP
     * @param {Object} credentials 
     * @param {string} credentials.smtp_host
     * @param {number} credentials.smtp_port
     * @param {string} credentials.smtp_user
     * @param {string} credentials.smtp_password
     * @param {string} credentials.smtp_from_email
     * @param {string} credentials.smtp_from_name
     * @param {boolean} credentials.email_enabled
     */
    static async updateSMTPConfig(credentials) {
        try {
            const response = await axiosInstance.put('/system-config/smtp', credentials);
            return response.data;
        } catch (error) {
            console.error('Error al actualizar configuración SMTP:', error);
            throw error;
        }
    }

    /**
     * Prueba la conexión SMTP enviando un correo de prueba
     */
    static async testSMTPConnection() {
        try {
            const response = await axiosInstance.post('/system-config/smtp/test', {}, {
                timeout: 20000 // 20 segundos (envío de email puede tardar más)
            });
            return response.data;
        } catch (error) {
            console.error('Error al probar conexión SMTP:', error);
            throw error;
        }
    }
}

export default SystemConfigService;
