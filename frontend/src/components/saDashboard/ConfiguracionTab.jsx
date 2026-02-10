import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Mail, Lightbulb } from 'lucide-react';
import ZoomCredentialCard from './components/ZoomCredentialCard';
import ZoomConfigModal from './components/ZoomConfigModal';
import SMTPCredentialCard from './components/SMTPCredentialCard';
import SMTPConfigModal from './components/SMTPConfigModal';
import SystemConfigService from '../../services/api/SystemConfigService';
import Swal from 'sweetalert2';

const ConfiguracionTab = ({ onBack }) => {
    // Estado para Zoom
    const [currentConfig, setCurrentConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Estado para SMTP
    const [smtpConfig, setSmtpConfig] = useState(null);
    const [isLoadingSMTP, setIsLoadingSMTP] = useState(true);
    const [showSMTPModal, setShowSMTPModal] = useState(false);
    const [isSavingSMTP, setIsSavingSMTP] = useState(false);

    useEffect(() => {
        loadCurrentConfig();
        loadSMTPConfig();
    }, []);

    const loadCurrentConfig = async () => {
        setIsLoading(true);
        try {
            const response = await SystemConfigService.getZoomConfig();
            if (response.success) {
                setCurrentConfig(response.data);
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
            setCurrentConfig(null);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSMTPConfig = async () => {
        setIsLoadingSMTP(true);
        try {
            const [statusResponse, configResponse] = await Promise.all([
                SystemConfigService.checkSMTPConfigStatus(),
                SystemConfigService.getSMTPConfig()
            ]);
            
            if (configResponse.success) {
                setSmtpConfig({
                    ...configResponse.data,
                    isConfigured: statusResponse.data?.configured || false
                });
            }
        } catch (error) {
            console.error('Error al cargar configuración SMTP:', error);
            setSmtpConfig({ isConfigured: false });
        } finally {
            setIsLoadingSMTP(false);
        }
    };

    const handleSaveZoomConfig = async (credentials) => {
        setIsSaving(true);
        try {
            const response = await SystemConfigService.updateZoomConfig(credentials);
            
            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: 'Configuración de Zoom actualizada exitosamente',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    backdrop: false
                });
                
                setShowZoomModal(false);
                await loadCurrentConfig();
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || error.message || 'Error al guardar la configuración'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSMTPConfig = async (credentials) => {
        setIsSavingSMTP(true);
        try {
            const response = await SystemConfigService.updateSMTPConfig(credentials);
            
            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: 'Configuración SMTP actualizada exitosamente',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    backdrop: false
                });
                
                setShowSMTPModal(false);
                await loadSMTPConfig();
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || error.message || 'Error al guardar la configuración SMTP'
            });
        } finally {
            setIsSavingSMTP(false);
        }
    };

    const isZoomConfigured = currentConfig && 
        currentConfig.sdk_key && 
        currentConfig.account_id && 
        currentConfig.client_id;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Volver"
                        >
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white shadow-lg">
                            <Settings size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                Configuración
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Gestiona las integraciones y configuraciones del sistema
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección de Integraciones */}
            <div>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Integraciones
                    </h2>
                    <p className="text-gray-600">
                        Configura las integraciones de terceros para extender la funcionalidad del sistema
                    </p>
                </div>

                {/* Grid de Cards de Integraciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Tarjeta de Zoom */}
                    <ZoomCredentialCard
                        isConfigured={isZoomConfigured}
                        lastUpdated={currentConfig?.last_updated}
                        onConfigure={() => setShowZoomModal(true)}
                        isLoading={isLoading}
                    />

                    {/* Tarjeta de SMTP */}
                    <SMTPCredentialCard
                        isConfigured={smtpConfig?.isConfigured || false}
                        lastUpdated={smtpConfig?.last_updated}
                        onConfigure={() => setShowSMTPModal(true)}
                        isLoading={isLoadingSMTP}
                    />
                </div>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Settings size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <Lightbulb size={18} className="flex-shrink-0" />
                            Sobre las Integraciones
                        </h3>
                        <p className="text-sm text-blue-800">
                            Las integraciones te permiten conectar GIRAMASTER con servicios externos para mejorar la funcionalidad del sistema. 
                            <strong> Zoom</strong> es necesario para realizar reuniones virtuales y <strong>SMTP</strong> para enviar notificaciones por correo electrónico.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal de Configuración de Zoom */}
            <ZoomConfigModal
                isOpen={showZoomModal}
                onClose={() => setShowZoomModal(false)}
                currentConfig={currentConfig}
                onSave={handleSaveZoomConfig}
                isSaving={isSaving}
            />

            {/* Modal de Configuración de SMTP */}
            <SMTPConfigModal
                isOpen={showSMTPModal}
                onClose={() => setShowSMTPModal(false)}
                currentConfig={smtpConfig}
                onSave={handleSaveSMTPConfig}
                isSaving={isSavingSMTP}
            />
        </div>
    );
};

export default ConfiguracionTab;
