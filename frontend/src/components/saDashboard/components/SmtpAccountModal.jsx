import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
    X, Save, TestTube, Eye, EyeOff, HelpCircle,
    Server, Key, Settings as SettingsIcon, Mail, AlertTriangle, CheckCircle, Hash
} from 'lucide-react';
import Modal from '../../common/Modal';
import Swal from 'sweetalert2';
import SystemConfigService from '../../../services/api/SystemConfigService';

const Tooltip = ({ text }) => (
    <div className="group relative inline-block">
        <HelpCircle size={15} className="text-gray-400 cursor-help" />
        <div className="invisible group-hover:visible absolute z-20 w-64 p-2 mt-1 text-xs text-white bg-gray-900 rounded-lg shadow-lg -left-24">
            {text}
            <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -top-1 left-1/2" />
        </div>
    </div>
);

const SmtpAccountModal = ({ isOpen, onClose, editingAccount, onSave, isSaving }) => {
    const [activeTab, setActiveTab] = useState('credentials');
    const [showPassword, setShowPassword] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [passwordConfigured, setPasswordConfigured] = useState(false);

    const isEditing = !!editingAccount;

    const { register, handleSubmit, reset, getValues, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            user: '',
            password: '',
            host: 'smtp.gmail.com',
            port: 587,
            from_email: '',
            from_name: 'GIRAMASTER - Sistema de Asambleas',
            daily_limit: 500,
        }
    });

    useEffect(() => {
        if (isOpen) {
            setActiveTab('credentials');
            setShowPassword(false);

            if (editingAccount) {
                reset({
                    name: editingAccount.name || '',
                    user: editingAccount.email || '',
                    password: '',
                    host: editingAccount.host || 'smtp.gmail.com',
                    port: editingAccount.port || 587,
                    from_email: editingAccount.from_email || '',
                    from_name: editingAccount.from_name || 'GIRAMASTER - Sistema de Asambleas',
                    daily_limit: editingAccount.daily_limit || 500,
                });
                setPasswordConfigured(!!editingAccount.password || !!editingAccount.email);
            } else {
                reset({
                    name: '',
                    user: '',
                    password: '',
                    host: 'smtp.gmail.com',
                    port: 587,
                    from_email: '',
                    from_name: 'GIRAMASTER - Sistema de Asambleas',
                    daily_limit: 500,
                });
                setPasswordConfigured(false);
            }
        }
    }, [isOpen, editingAccount, reset]);

    const sanitizeData = (data) => {
        const out = { ...data };
        // Si el password está vacío y estamos editando, no lo enviamos (conserva el existente)
        if (!out.password || out.password.trim() === '' || out.password.startsWith('***')) {
            delete out.password;
        }
        if (!out.from_email || out.from_email.trim() === '') out.from_email = null;
        if (!out.from_name || out.from_name.trim() === '') out.from_name = null;
        // Asegurar tipos correctos
        out.port = parseInt(out.port, 10);
        out.daily_limit = parseInt(out.daily_limit, 10);
        return out;
    };

    const onSubmit = (data) => {
        onSave(sanitizeData(data));
    };

    const handleTestConnection = async () => {
        if (!editingAccount?.id) {
            Swal.fire({
                icon: 'info',
                title: 'Guarda primero',
                text: 'Guarda la cuenta antes de probar la conexión.',
            });
            return;
        }

        // Guardar cambios actuales antes de probar
        const values = getValues();
        const hasChanges = values.password && values.password.trim();

        setIsTesting(true);
        Swal.fire({
            title: 'Probando conexión SMTP...',
            text: 'Enviando correo de prueba, por favor espera',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        try {
            if (hasChanges) {
                await onSave(sanitizeData(values));
            }

            const response = await SystemConfigService.testSMTPAccount(editingAccount.id);
            Swal.close();

            if (response.success && response.data?.email_sent) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Correo enviado!',
                    html: `<p>Correo de prueba enviado exitosamente a:</p><p class="font-bold text-blue-600 mt-2">${response.data.recipient_email}</p><p class="text-sm text-gray-500 mt-1">Verifica tu bandeja de entrada</p>`,
                    confirmButtonColor: '#27ae60',
                });
            } else if (response.data?.rate_limited) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Límite excedido',
                    text: 'Esta cuenta ha excedido su límite diario de Gmail.',
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al enviar',
                    text: response.message || 'No se pudo enviar el correo. Verifica las credenciales.',
                });
            }
        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || error.message || 'Error al probar la conexión SMTP',
            });
        } finally {
            setIsTesting(false);
        }
    };

    const tabs = [
        { id: 'credentials', label: 'Credenciales', icon: Key },
        { id: 'server', label: 'Servidor', icon: Server },
        { id: 'config', label: 'Avanzado', icon: SettingsIcon },
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
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditing ? `Editar cuenta SMTP` : 'Nueva cuenta SMTP'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {isEditing
                                    ? `Cuenta #${editingAccount.id} — ${editingAccount.name}`
                                    : 'Registra una cuenta Gmail para envío de correos'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={22} className="text-gray-600" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-gray-200">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all border-b-2 ${
                                activeTab === id
                                    ? 'text-orange-600 border-orange-600'
                                    : 'text-gray-500 border-transparent hover:text-orange-500'
                            }`}
                        >
                            <Icon size={17} />
                            {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                    {/* ── TAB: Credenciales ── */}
                    {activeTab === 'credentials' && (
                        <div className="space-y-5">
                            {/* Nombre de la cuenta */}
                            <div>
                                <label className="block mb-1.5 text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    Nombre de la cuenta *
                                    <Tooltip text="Nombre descriptivo para identificar esta cuenta (ej: 'Cuenta Principal', 'Respaldo 1')" />
                                </label>
                                <input
                                    type="text"
                                    {...register('name', {
                                        required: 'El nombre es obligatorio',
                                        maxLength: { value: 50, message: 'Máximo 50 caracteres' }
                                    })}
                                    placeholder="Ej: Cuenta Principal"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                            </div>

                            {/* Email usuario */}
                            <div>
                                <label className="block mb-1.5 text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    Correo Gmail *
                                    <Tooltip text="La dirección Gmail que se usará para enviar correos" />
                                </label>
                                <input
                                    type="email"
                                    {...register('user', {
                                        required: 'El correo es obligatorio',
                                        pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email inválido' }
                                    })}
                                    placeholder="tucorreo@gmail.com"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${errors.user ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {errors.user && <p className="text-red-500 text-xs mt-1">{errors.user.message}</p>}
                            </div>

                            {/* Contraseña de aplicación */}
                            <div>
                                <label className="block mb-1.5 text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    Contraseña de aplicación {isEditing ? '' : '*'}
                                    <Tooltip text="NO es tu contraseña de Gmail. Genera una 'App Password' en tu cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones" />
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        {...register('password', {
                                            required: isEditing ? false : 'La contraseña es obligatoria',
                                        })}
                                        placeholder={
                                            isEditing
                                                ? 'Dejar vacío para mantener la actual'
                                                : 'App Password de 16 caracteres (ej: abcd efgh ijkl mnop)'
                                        }
                                        className={`w-full p-3 pr-12 border-2 rounded-lg font-mono text-sm focus:outline-none focus:border-orange-500 ${errors.password ? 'border-red-400' : 'border-gray-300'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                                {isEditing && passwordConfigured && (
                                    <div className="mt-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                        <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                                        <p className="text-xs text-green-700">Contraseña configurada. Deja vacío para mantenerla.</p>
                                    </div>
                                )}
                                {/* Instrucciones App Password */}
                                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-xs text-yellow-800 flex items-start gap-1.5 font-medium">
                                        <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                                        Importante: usa una Contraseña de Aplicación, no tu contraseña de Gmail
                                    </p>
                                    <ol className="text-xs text-yellow-700 mt-1.5 ml-4 list-decimal space-y-0.5">
                                        <li>Ve a <span className="font-mono">myaccount.google.com</span></li>
                                        <li>Seguridad → Verificación en 2 pasos (actívala si no está)</li>
                                        <li>Busca "Contraseñas de aplicaciones" → Generar</li>
                                        <li>Copia los 16 caracteres y pégalos aquí</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Servidor ── */}
                    {activeTab === 'server' && (
                        <div className="space-y-5">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <p className="text-xs text-orange-700 flex items-start gap-1.5">
                                    <Server size={14} className="mt-0.5 flex-shrink-0" />
                                    Para Gmail los valores por defecto son correctos. Solo cámbialos si usas otro proveedor.
                                </p>
                            </div>

                            <div>
                                <label className="block mb-1.5 text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    Servidor SMTP *
                                    <Tooltip text="Para Gmail: smtp.gmail.com. Para Outlook: smtp.office365.com" />
                                </label>
                                <input
                                    type="text"
                                    {...register('host', { required: 'El servidor es obligatorio' })}
                                    placeholder="smtp.gmail.com"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${errors.host ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {errors.host && <p className="text-red-500 text-xs mt-1">{errors.host.message}</p>}
                            </div>

                            <div>
                                <label className="block mb-1.5 text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    Puerto SMTP *
                                    <Tooltip text="587 = STARTTLS (recomendado para Gmail). 465 = SSL/TLS." />
                                </label>
                                <input
                                    type="number"
                                    {...register('port', {
                                        required: 'El puerto es obligatorio',
                                        min: { value: 1, message: 'Puerto inválido' },
                                        max: { value: 65535, message: 'Puerto inválido' }
                                    })}
                                    placeholder="587"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${errors.port ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {errors.port && <p className="text-red-500 text-xs mt-1">{errors.port.message}</p>}
                                <p className="text-xs text-gray-400 mt-1">Recomendado: 587 (STARTTLS)</p>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Avanzado ── */}
                    {activeTab === 'config' && (
                        <div className="space-y-5">
                            <div>
                                <label className="block mb-1.5 text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    Nombre del remitente
                                    <Tooltip text="Nombre que verán los destinatarios en el campo 'De:'" />
                                </label>
                                <input
                                    type="text"
                                    {...register('from_name', { maxLength: { value: 100, message: 'Máximo 100 caracteres' } })}
                                    placeholder="GIRAMASTER - Sistema de Asambleas"
                                    className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block mb-1.5 text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    Email del remitente
                                    <Tooltip text="Opcional. Si se omite, se usa el correo Gmail como remitente" />
                                </label>
                                <input
                                    type="email"
                                    {...register('from_email', {
                                        pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email inválido' }
                                    })}
                                    placeholder="opcional@ejemplo.com"
                                    className={`w-full p-3 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${errors.from_email ? 'border-red-400' : 'border-gray-300'}`}
                                />
                                {errors.from_email && <p className="text-red-500 text-xs mt-1">{errors.from_email.message}</p>}
                                <p className="text-xs text-gray-400 mt-1">Opcional. Si se deja vacío usa el correo Gmail.</p>
                            </div>

                            <div>
                                <label className="block mb-1.5 text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                    Límite diario de envíos
                                    <Tooltip text="Gmail gratuito: ~500/día. Gmail Workspace: ~2000/día. El sistema cambia automáticamente de cuenta al alcanzar este límite." />
                                </label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number"
                                        {...register('daily_limit', {
                                            required: 'Campo obligatorio',
                                            min: { value: 1, message: 'Mínimo 1' }
                                        })}
                                        placeholder="500"
                                        className={`w-full p-3 pl-9 border-2 rounded-lg text-sm focus:outline-none focus:border-orange-500 ${errors.daily_limit ? 'border-red-400' : 'border-gray-300'}`}
                                    />
                                </div>
                                {errors.daily_limit && <p className="text-red-500 text-xs mt-1">{errors.daily_limit.message}</p>}
                                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <strong>Límites de Gmail:</strong> Cuenta gratuita ≈ 500/día · Google Workspace ≈ 2.000/día.
                                        El sistema detecta el límite real por el error de Gmail y cambia de cuenta automáticamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={isTesting || isSaving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <TestTube size={17} />
                                {isTesting ? 'Probando...' : 'Probar'}
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isSaving || isTesting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-semibold text-sm hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={17} />
                            {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cuenta'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default SmtpAccountModal;
