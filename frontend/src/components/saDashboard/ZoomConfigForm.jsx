import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, TestTube, Eye, EyeOff, HelpCircle, Lock, Smartphone } from 'lucide-react';
import Swal from 'sweetalert2';
import SystemConfigService from '../../services/api/SystemConfigService';

const ZoomConfigForm = ({ 
    initialValues = {}, 
    onSave, 
    onCancel, 
    isSaving = false,
    showTestButton = true 
}) => {
    const [showSecrets, setShowSecrets] = useState({
        sdk_secret: false,
        client_secret: false
    });
    const [isTesting, setIsTesting] = useState(false);

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors }
    } = useForm({
        defaultValues: {
            sdk_key: initialValues.sdk_key || '',
            sdk_secret: initialValues.sdk_secret || '',
            account_id: initialValues.account_id || '',
            client_id: initialValues.client_id || '',
            client_secret: initialValues.client_secret || ''
        }
    });

    const toggleShowSecret = (field) => {
        setShowSecrets(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleTestConnection = async () => {
        const values = getValues();
        
        // Validar que todos los campos estén llenos
        const allFilled = Object.values(values).every(v => v && v.trim());
        if (!allFilled) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos Incompletos',
                text: 'Por favor completa todos los campos antes de probar la conexión'
            });
            return;
        }

        setIsTesting(true);
        Swal.fire({
            title: 'Probando Conexión...',
            text: 'Por favor espera mientras verificamos las credenciales',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            // Primero guardar las credenciales
            await onSave(values);
            
            // Luego probar la conexión
            const response = await SystemConfigService.testZoomConnection();
            
            Swal.close();
            
            if (response.success && response.data.token_obtained) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Conexión Exitosa!',
                    text: 'Las credenciales de Zoom son válidas y la conexión fue exitosa',
                    confirmButtonColor: '#27ae60'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Conexión Fallida',
                    text: response.data?.error || 'No se pudo establecer conexión con Zoom. Verifica tus credenciales.'
                });
            }
        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error al Probar Conexión',
                text: error.response?.data?.detail || error.message || 'Error al probar la conexión con Zoom'
            });
        } finally {
            setIsTesting(false);
        }
    };

    const onSubmit = (data) => {
        onSave(data);
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

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Sección Meeting SDK */}
            <div className="border-2 border-blue-100 rounded-lg p-6 bg-blue-50">
                <h4 className="font-bold text-lg text-blue-800 mb-4 flex items-center gap-2">
                    <Smartphone size={20} /> Meeting SDK Credentials
                    <Tooltip text="Estas credenciales permiten a los usuarios unirse a reuniones desde el navegador" />
                </h4>
                
                {/* SDK Key */}
                <div className="mb-4">
                    <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                        SDK Key *
                        <Tooltip text="Clave pública para inicializar el Zoom Meeting SDK. Es seguro exponerla al frontend." />
                    </label>
                    <input
                        type="text"
                        {...register('sdk_key', {
                            required: 'El SDK Key es obligatorio',
                            minLength: { value: 10, message: 'Mínimo 10 caracteres' }
                        })}
                        placeholder="Ej: v3RL9_2sSWK0HtBUXsKjtg"
                        className={`w-full p-3 border-2 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-500 ${
                            errors.sdk_key ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                    {errors.sdk_key && (
                        <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                            {errors.sdk_key.message}
                        </span>
                    )}
                </div>

                {/* SDK Secret */}
                <div>
                    <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                        SDK Secret *
                        <Tooltip text="Clave secreta para firmar tokens JWT. Debe mantenerse privada." />
                    </label>
                    <div className="relative">
                        <input
                            type={showSecrets.sdk_secret ? 'text' : 'password'}
                            {...register('sdk_secret', {
                                required: 'El SDK Secret es obligatorio',
                                minLength: { value: 15, message: 'Mínimo 15 caracteres' }
                            })}
                            placeholder="Ej: 1ZdWaM2lbEG0DOMk3LUj6J7rjGcSbXk1"
                            className={`w-full p-3 pr-12 border-2 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-500 ${
                                errors.sdk_secret ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => toggleShowSecret('sdk_secret')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showSecrets.sdk_secret ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {errors.sdk_secret && (
                        <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                            {errors.sdk_secret.message}
                        </span>
                    )}
                </div>
            </div>

            {/* Sección Server-to-Server OAuth */}
            <div className="border-2 border-green-100 rounded-lg p-6 bg-green-50">
                <h4 className="font-bold text-lg text-green-800 mb-4 flex items-center gap-2">
                    🔐 Server-to-Server OAuth Credentials
                    <Tooltip text="Estas credenciales permiten crear, modificar y eliminar reuniones mediante la API REST de Zoom" />
                </h4>
                
                {/* Account ID */}
                <div className="mb-4">
                    <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                        Account ID *
                        <Tooltip text="Identificador único de tu cuenta de Zoom" />
                    </label>
                    <input
                        type="text"
                        {...register('account_id', {
                            required: 'El Account ID es obligatorio',
                            minLength: { value: 10, message: 'Mínimo 10 caracteres' }
                        })}
                        placeholder="Ej: 4nFl7Xj5Qu68SC0gocai9A"
                        className={`w-full p-3 border-2 rounded-lg font-mono text-sm focus:outline-none focus:border-green-500 ${
                            errors.account_id ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                    {errors.account_id && (
                        <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                            {errors.account_id.message}
                        </span>
                    )}
                </div>

                {/* Client ID */}
                <div className="mb-4">
                    <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                        Client ID *
                        <Tooltip text="ID del cliente OAuth de tu aplicación Server-to-Server" />
                    </label>
                    <input
                        type="text"
                        {...register('client_id', {
                            required: 'El Client ID es obligatorio',
                            minLength: { value: 10, message: 'Mínimo 10 caracteres' }
                        })}
                        placeholder="Ej: NTVgxiKKQrCgJ72VHbtKw"
                        className={`w-full p-3 border-2 rounded-lg font-mono text-sm focus:outline-none focus:border-green-500 ${
                            errors.client_id ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                    {errors.client_id && (
                        <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                            {errors.client_id.message}
                        </span>
                    )}
                </div>

                {/* Client Secret */}
                <div>
                    <label className="block mb-2 font-semibold text-gray-700 flex items-center gap-2">
                        Client Secret *
                        <Tooltip text="Clave secreta OAuth. Debe mantenerse privada y nunca exponerse al frontend." />
                    </label>
                    <div className="relative">
                        <input
                            type={showSecrets.client_secret ? 'text' : 'password'}
                            {...register('client_secret', {
                                required: 'El Client Secret es obligatorio',
                                minLength: { value: 15, message: 'Mínimo 15 caracteres' }
                            })}
                            placeholder="Ej: 1GXpJbSZ9HMQvQQuS5XH6rYJ7IZw1dmC"
                            className={`w-full p-3 pr-12 border-2 rounded-lg font-mono text-sm focus:outline-none focus:border-green-500 ${
                                errors.client_secret ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => toggleShowSecret('client_secret')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showSecrets.client_secret ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {errors.client_secret && (
                        <span className="text-red-500 text-sm flex items-center gap-1 mt-1">
                            {errors.client_secret.message}
                        </span>
                    )}
                </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
                <button
                    type="submit"
                    disabled={isSaving || isTesting}
                    className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all ${
                        (isSaving || isTesting) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {isSaving ? (
                        <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Guardar Configuración
                        </>
                    )}
                </button>

                {showTestButton && (
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isSaving || isTesting}
                        className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all ${
                            (isSaving || isTesting) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {isTesting ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Probando...
                            </>
                        ) : (
                            <>
                                <TestTube size={20} />
                                Probar Conexión
                            </>
                        )}
                    </button>
                )}

                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving || isTesting}
                        className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                )}
            </div>

            {/* Nota de Seguridad */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                    <Lock size={16} /> <strong>Seguridad:</strong> Todas las credenciales sensibles se almacenan encriptadas en la base de datos. 
                    Los valores privados nunca se exponen al frontend.
                </p>
            </div>
        </form>
    );
};

export default ZoomConfigForm;
