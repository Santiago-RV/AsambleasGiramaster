import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, TestTube, Eye, EyeOff, HelpCircle, Server, Key, Settings as SettingsIcon, Mail, Monitor, AlertTriangle } from 'lucide-react';
import Modal from '../../common/Modal';
import Swal from 'sweetalert2';
import SystemConfigService from '../../../services/api/SystemConfigService';

const SMTPConfigModal = ({ isOpen, onClose, currentConfig, onSave, isSaving }) => {
    const [activeTab, setActiveTab] = useState('server');
    const [showPassword, setShowPassword] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors }
    } = useForm({
        defaultValues: {
            smtp_host: currentConfig?.smtp_host || '',
            smtp_port: currentConfig?.smtp_port || 587,
            smtp_user: currentConfig?.smtp_user || '',
            smtp_password: currentConfig?.smtp_password || '',
            smtp_from_email: currentConfig?.smtp_from_email || '',
            smtp_from_name: currentConfig?.smtp_from_name || 'GIRAMASTER - Sistema de Asambleas',
            email_enabled: currentConfig?.email_enabled !== undefined ? currentConfig.email_enabled : true
        }
    });

    const toggleShowPassword = () => {
        setShowPassword(prev => !prev);
    };

    const handleTestConnection = async () => {
        const values = getValues();
        
        // Validar campos requeridos
        const requiredFields = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password'];
        const allFilled = requiredFields.every(field => values[field] && String(values[field]).trim());
        
        if (!allFilled) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos Incompletos',
                text: 'Por favor completa los campos obligatorios (Servidor, Puerto, Usuario y Contraseña) antes de probar la conexión'
            });
            return;
        }

        setIsTesting(true);
        Swal.fire({
            title: 'Probando Conexión SMTP...',
            text: 'Por favor espera mientras enviamos un correo de prueba',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            // Primero guardar las credenciales (sanitizar campos opcionales)
            await onSave(sanitizeData(values));
            
            // Luego probar la conexión
            const response = await SystemConfigService.testSMTPConnection();
            
            Swal.close();
            
            if (response.success && response.data.email_sent) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Email Enviado!',
                    html: `
                        <p>Se envió un correo de prueba exitosamente a:</p>
                        <p class="font-bold text-blue-600 mt-2">${response.data.recipient_email}</p>
                        <p class="text-sm text-gray-600 mt-2">Verifica tu bandeja de entrada</p>
                    `,
                    confirmButtonColor: '#27ae60'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al Enviar Email',
                    text: response.message || 'No se pudo enviar el correo de prueba. Verifica las credenciales.'
                });
            }
        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || error.message || 'Error al probar conexión SMTP'
            });
        } finally {
            setIsTesting(false);
        }
    };

    const sanitizeData = (data) => {
        const sanitized = { ...data };
        // Convertir cadenas vacías a null en campos opcionales
        // para evitar error de validación EmailStr en el backend
        if (!sanitized.smtp_from_email || sanitized.smtp_from_email.trim() === '') {
            sanitized.smtp_from_email = null;
        }
        if (!sanitized.smtp_from_name || sanitized.smtp_from_name.trim() === '') {
            sanitized.smtp_from_name = null;
        }
        return sanitized;
    };

    const onSubmit = (data) => {
        onSave(sanitizeData(data));
    };

    const Tooltip = ({ text }) => (
        <div className="group relative inline-block">
            <HelpCircle size={16} className="text-gray-400 cursor-help" />
            <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-900 rounded-lg shadow-lg -left-24">
                {text}
                <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -top-1 left-1/2"></div>
            </div>
        </div>
    );

    const tabs = [
        { id: 'server', label: 'Servidor', icon: Server },
        { id: 'credentials', label: 'Credenciales', icon: Key },
        { id: 'config', label: 'Configuración', icon: SettingsIcon }
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                            <Mail size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">
                                Configurar Servidor SMTP
                            </h2>
                            <p className="text-sm text-gray-600">
                                Configura el servidor de correo electrónico
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-600" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all border-b-2 ${
                                    activeTab === tab.id
                                        ? 'text-blue-600 border-blue-600'
                                        : 'text-gray-600 border-transparent hover:text-blue-500'
                                }`}
                            >
                                <Icon size={20} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Tab Content: Servidor */}
                    {activeTab === 'server' && (
                        <div className="space-y-6">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <p className="text-sm text-orange-700 flex items-start gap-2">
                                    <Monitor size={16} className="mt-0.5 flex-shrink-0" />
                                    <span><strong>Servidor SMTP:</strong> Configura la dirección y puerto del servidor de correo electrónico.</span>
                                </p>
                            </div>

                            {/* SMTP Host */}
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                                    Servidor SMTP *
                                    <Tooltip text="Dirección del servidor SMTP (ej: smtp.gmail.com, smtp.office365.com)" />
                                </label>
                                <input
                                    type="text"
                                    {...register('smtp_host', {
                                        required: 'El servidor SMTP es obligatorio',
                                        minLength: { value: 3, message: 'Mínimo 3 caracteres' }
                                    })}
                                    placeholder="Ej: smtp.gmail.com"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${
                                        errors.smtp_host ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.smtp_host && (
                                    <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                        {errors.smtp_host.message}
                                    </span>
                                )}
                            </div>

                            {/* SMTP Port */}
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                                    Puerto SMTP *
                                    <Tooltip text="Puerto común: 587 (TLS) o 465 (SSL)" />
                                </label>
                                <input
                                    type="number"
                                    {...register('smtp_port', {
                                        required: 'El puerto SMTP es obligatorio',
                                        min: { value: 1, message: 'El puerto debe ser mayor a 0' },
                                        max: { value: 65535, message: 'El puerto debe ser menor a 65536' }
                                    })}
                                    placeholder="587"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${
                                        errors.smtp_port ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.smtp_port && (
                                    <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                        {errors.smtp_port.message}
                                    </span>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    Puertos comunes: 587 (STARTTLS), 465 (SSL/TLS), 25 (sin cifrado)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tab Content: Credenciales */}
                    {activeTab === 'credentials' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-700 flex items-start gap-2">
                                    <Key size={16} className="mt-0.5 flex-shrink-0" />
                                    <span><strong>Credenciales:</strong> Usuario y contraseña para autenticación SMTP.</span>
                                </p>
                            </div>

                            {/* SMTP User */}
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                                    Email Usuario *
                                    <Tooltip text="Correo electrónico para autenticación SMTP" />
                                </label>
                                <input
                                    type="email"
                                    {...register('smtp_user', {
                                        required: 'El email usuario es obligatorio',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Email inválido'
                                        }
                                    })}
                                    placeholder="tucorreo@ejemplo.com"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${
                                        errors.smtp_user ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.smtp_user && (
                                    <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                        {errors.smtp_user.message}
                                    </span>
                                )}
                            </div>

                            {/* SMTP Password */}
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                                    Contraseña *
                                    <Tooltip text="Para Gmail: Genera una 'Contraseña de Aplicación' en myaccount.google.com > Seguridad > Verificación en 2 pasos > Contraseñas de aplicaciones" />
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        {...register('smtp_password', {
                                            required: 'La contraseña es obligatoria',
                                            minLength: { value: 1, message: 'La contraseña no puede estar vacía' }
                                        })}
                                        placeholder="Ingresa tu contraseña o App Password"
                                        className={`w-full p-3 pr-12 border-2 rounded-lg font-mono text-sm focus:outline-none focus:border-orange-500 ${
                                            errors.smtp_password ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={toggleShowPassword}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.smtp_password && (
                                    <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                        {errors.smtp_password.message}
                                    </span>
                                )}
                                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-xs text-yellow-800 flex items-start gap-1.5">
                                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                        <span><strong>Importante para Gmail:</strong> No uses tu contraseña normal. Genera una "Contraseña de Aplicación":</span>
                                    </p>
                                    <ol className="text-xs text-yellow-700 mt-1 ml-4 list-decimal">
                                        <li>Ve a myaccount.google.com</li>
                                        <li>Seguridad → Verificación en 2 pasos</li>
                                        <li>Contraseñas de aplicaciones → Generar</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Content: Configuración */}
                    {activeTab === 'config' && (
                        <div className="space-y-6">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="text-sm text-purple-700 flex items-start gap-2">
                                    <SettingsIcon size={16} className="mt-0.5 flex-shrink-0" />
                                    <span><strong>Configuración Avanzada:</strong> Personaliza el remitente y habilita/deshabilita el envío de correos.</span>
                                </p>
                            </div>

                            {/* From Name */}
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                                    Nombre del Remitente
                                    <Tooltip text="Nombre visible del remitente en los correos (opcional)" />
                                </label>
                                <input
                                    type="text"
                                    {...register('smtp_from_name', {
                                        maxLength: { value: 100, message: 'Máximo 100 caracteres' }
                                    })}
                                    placeholder="GIRAMASTER - Sistema de Asambleas"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${
                                        errors.smtp_from_name ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.smtp_from_name && (
                                    <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                        {errors.smtp_from_name.message}
                                    </span>
                                )}
                            </div>

                            {/* From Email */}
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                                    Email del Remitente
                                    <Tooltip text="Correo del remitente (opcional). Si se deja vacío, usa el email de usuario" />
                                </label>
                                <input
                                    type="email"
                                    {...register('smtp_from_email', {
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Email inválido'
                                        }
                                    })}
                                    placeholder="opcional@ejemplo.com (dejar vacío para usar el email de usuario)"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${
                                        errors.smtp_from_email ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.smtp_from_email && (
                                    <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                                        {errors.smtp_from_email.message}
                                    </span>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    Opcional. Si no se especifica, se usará el email de usuario como remitente.
                                </p>
                            </div>

                            {/* Email Enabled */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex-1">
                                    <label className="font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
                                        Activar Envío de Correos
                                        <Tooltip text="Activar/desactivar el envío de correos del sistema" />
                                    </label>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Si se desactiva, el sistema no enviará ningún correo electrónico
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        {...register('email_enabled')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-600"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTesting || isSaving}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <TestTube size={20} />
                            {isTesting ? 'Probando...' : 'Probar Conexión'}
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isTesting}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={20} />
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default SMTPConfigModal;
