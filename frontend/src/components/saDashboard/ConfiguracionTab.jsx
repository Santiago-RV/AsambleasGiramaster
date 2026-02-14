import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Mail, Lightbulb, Plus } from 'lucide-react';
import ZoomCredentialCard from './components/ZoomCredentialCard';
import ZoomConfigModal from './components/ZoomConfigModal';
import SMTPCredentialCard from './components/SMTPCredentialCard';
import SMTPConfigModal from './components/SMTPConfigModal';
import SystemConfigService from '../../services/api/SystemConfigService';
import Swal from 'sweetalert2';

const MAX_ZOOM_ACCOUNTS = 3;

const ConfiguracionTab = ({ onBack }) => {
    // Estado para Zoom (multi-cuenta)
    const [zoomAccounts, setZoomAccounts] = useState([]);
    const [isLoadingZoom, setIsLoadingZoom] = useState(true);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null); // null = crear nueva, {id, ...} = editar
    const [isSavingZoom, setIsSavingZoom] = useState(false);

    // Estado para SMTP
    const [smtpConfig, setSmtpConfig] = useState(null);
    const [isLoadingSMTP, setIsLoadingSMTP] = useState(true);
    const [showSMTPModal, setShowSMTPModal] = useState(false);
    const [isSavingSMTP, setIsSavingSMTP] = useState(false);

    useEffect(() => {
        loadZoomAccounts();
        loadSMTPConfig();
    }, []);

    const loadZoomAccounts = async () => {
        setIsLoadingZoom(true);
        try {
            const response = await SystemConfigService.getZoomAccounts();
            if (response.success) {
                setZoomAccounts(response.data.accounts || []);
            }
        } catch (error) {
            console.error('Error al cargar cuentas Zoom:', error);
            setZoomAccounts([]);
        } finally {
            setIsLoadingZoom(false);
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
            console.error('Error al cargar configuracion SMTP:', error);
            setSmtpConfig({ isConfigured: false });
        } finally {
            setIsLoadingSMTP(false);
        }
    };

    // === Zoom handlers ===

    const handleOpenZoomCreate = () => {
        setEditingAccount(null);
        setShowZoomModal(true);
    };

    const handleOpenZoomEdit = async (accountId) => {
        try {
            const response = await SystemConfigService.getZoomAccount(accountId);
            if (response.success) {
                setEditingAccount({ id: accountId, ...response.data });
                setShowZoomModal(true);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar la cuenta Zoom'
            });
        }
    };

    const handleSaveZoomAccount = async (data) => {
        setIsSavingZoom(true);
        try {
            let response;
            if (editingAccount) {
                // Modo editar
                response = await SystemConfigService.updateZoomAccount(editingAccount.id, data);
            } else {
                // Modo crear
                response = await SystemConfigService.createZoomAccount(data);
            }

            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Exito',
                    text: editingAccount
                        ? 'Cuenta Zoom actualizada exitosamente'
                        : 'Cuenta Zoom creada exitosamente',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    backdrop: false
                });

                setShowZoomModal(false);
                setEditingAccount(null);
                await loadZoomAccounts();
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || error.message || 'Error al guardar la cuenta Zoom'
            });
        } finally {
            setIsSavingZoom(false);
        }
    };

    const handleDeleteZoomAccount = async (accountId) => {
        const account = zoomAccounts.find(a => a.id === accountId);
        const accountName = account?.name || `Cuenta #${accountId}`;

        const result = await Swal.fire({
            icon: 'warning',
            title: 'Eliminar Cuenta Zoom',
            html: `<p>Estas seguro de eliminar <strong>${accountName}</strong>?</p><p class="text-sm text-gray-500 mt-2">Se eliminaran todas las credenciales asociadas. Las reuniones ya creadas con esta cuenta no se veran afectadas.</p>`,
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const response = await SystemConfigService.deleteZoomAccount(accountId);
                if (response.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Eliminado',
                        text: 'La cuenta Zoom ha sido eliminada',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000,
                        backdrop: false
                    });
                    await loadZoomAccounts();
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.detail || 'Error al eliminar la cuenta Zoom'
                });
            }
        }
    };

    // === SMTP handlers ===

    const handleSaveSMTPConfig = async (credentials) => {
        setIsSavingSMTP(true);
        try {
            const response = await SystemConfigService.updateSMTPConfig(credentials);
            
            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Exito',
                    text: 'Configuracion SMTP actualizada exitosamente',
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
                text: error.response?.data?.detail || error.message || 'Error al guardar la configuracion SMTP'
            });
        } finally {
            setIsSavingSMTP(false);
        }
    };

    const canAddMoreZoomAccounts = zoomAccounts.length < MAX_ZOOM_ACCOUNTS;

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
                                Configuracion
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Gestiona las integraciones y configuraciones del sistema
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seccion de Integraciones */}
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
                    {/* Tarjetas de Zoom (dinámicas) */}
                    {zoomAccounts.map((account) => (
                        <ZoomCredentialCard
                            key={account.id}
                            accountId={account.id}
                            accountName={account.name}
                            isConfigured={account.is_configured}
                            lastUpdated={account.last_updated}
                            onConfigure={() => handleOpenZoomEdit(account.id)}
                            onDelete={handleDeleteZoomAccount}
                            isLoading={isLoadingZoom}
                        />
                    ))}

                    {/* Tarjeta para agregar nueva cuenta Zoom */}
                    {canAddMoreZoomAccounts && (
                        <div
                            onClick={handleOpenZoomCreate}
                            className="relative bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:shadow-lg hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center text-center min-h-[320px]"
                        >
                            <div className="relative w-20 h-20 bg-gray-200 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors mb-6">
                                <Plus size={40} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-500 group-hover:text-blue-700 transition-colors">
                                Agregar Cuenta Zoom
                            </h3>
                            <p className="text-sm text-gray-400 group-hover:text-blue-600 mt-2 transition-colors">
                                {zoomAccounts.length === 0
                                    ? 'Configura tu primera cuenta de Zoom'
                                    : `${zoomAccounts.length} de ${MAX_ZOOM_ACCOUNTS} cuentas configuradas`
                                }
                            </p>
                        </div>
                    )}

                    {/* Si no hay cuentas y no se pueden agregar (no deberia pasar, pero por seguridad) */}
                    {zoomAccounts.length === 0 && !canAddMoreZoomAccounts && !isLoadingZoom && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-8 text-center">
                            <p className="text-yellow-700">No hay cuentas Zoom configuradas</p>
                        </div>
                    )}

                    {/* Tarjeta de SMTP */}
                    <SMTPCredentialCard
                        isConfigured={smtpConfig?.isConfigured || false}
                        lastUpdated={smtpConfig?.last_updated}
                        onConfigure={() => setShowSMTPModal(true)}
                        isLoading={isLoadingSMTP}
                    />
                </div>
            </div>

            {/* Informacion adicional */}
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
                            <strong> Zoom</strong> es necesario para realizar reuniones virtuales (puedes configurar hasta {MAX_ZOOM_ACCOUNTS} cuentas para reuniones simultaneas) y <strong>SMTP</strong> para enviar notificaciones por correo electronico.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal de Configuracion de Zoom (crear/editar) */}
            <ZoomConfigModal
                isOpen={showZoomModal}
                onClose={() => {
                    setShowZoomModal(false);
                    setEditingAccount(null);
                }}
                editingAccount={editingAccount}
                onSave={handleSaveZoomAccount}
                isSaving={isSavingZoom}
            />

            {/* Modal de Configuracion de SMTP */}
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
