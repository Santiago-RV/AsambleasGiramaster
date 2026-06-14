import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Mail, Lightbulb, Plus } from 'lucide-react';
import ZoomCredentialCard from './components/ZoomCredentialCard';
import ZoomConfigModal from './components/ZoomConfigModal';
import SmtpAccountCard from './components/SmtpAccountCard';
import SmtpAccountModal from './components/SmtpAccountModal';
import SystemConfigService from '../../services/api/SystemConfigService';
import Swal from 'sweetalert2';

const MAX_ZOOM_ACCOUNTS = 3;

const ConfiguracionTab = ({ onBack }) => {
    // ── Zoom (multi-cuenta) ──
    const [zoomAccounts, setZoomAccounts] = useState([]);
    const [isLoadingZoom, setIsLoadingZoom] = useState(true);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [editingZoomAccount, setEditingZoomAccount] = useState(null);
    const [isSavingZoom, setIsSavingZoom] = useState(false);

    // ── SMTP (multi-cuenta) ──
    const [smtpAccounts, setSmtpAccounts] = useState([]);
    const [isLoadingSMTP, setIsLoadingSMTP] = useState(true);
    const [showSmtpModal, setShowSmtpModal] = useState(false);
    const [editingSmtpAccount, setEditingSmtpAccount] = useState(null);
    const [isSavingSMTP, setIsSavingSMTP] = useState(false);
    const [canAddMoreSMTP, setCanAddMoreSMTP] = useState(true);

    useEffect(() => {
        loadZoomAccounts();
        loadSmtpAccounts();
    }, []);

    // ====================================================
    // Zoom handlers
    // ====================================================

    const loadZoomAccounts = async () => {
        setIsLoadingZoom(true);
        try {
            const response = await SystemConfigService.getZoomAccounts();
            if (response.success) setZoomAccounts(response.data.accounts || []);
        } catch (error) {
            console.error('Error al cargar cuentas Zoom:', error);
            setZoomAccounts([]);
        } finally {
            setIsLoadingZoom(false);
        }
    };

    const handleOpenZoomCreate = () => {
        setEditingZoomAccount(null);
        setShowZoomModal(true);
    };

    const handleOpenZoomEdit = async (accountId) => {
        try {
            const response = await SystemConfigService.getZoomAccount(accountId);
            if (response.success) {
                setEditingZoomAccount({ id: accountId, ...response.data });
                setShowZoomModal(true);
            }
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la cuenta Zoom' });
        }
    };

    const handleSaveZoomAccount = async (data) => {
        setIsSavingZoom(true);
        try {
            const response = editingZoomAccount
                ? await SystemConfigService.updateZoomAccount(editingZoomAccount.id, data)
                : await SystemConfigService.createZoomAccount(data);

            if (response.success) {
                Swal.fire({
                    icon: 'success', title: 'Éxito',
                    text: editingZoomAccount ? 'Cuenta Zoom actualizada' : 'Cuenta Zoom creada',
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, backdrop: false
                });
                setShowZoomModal(false);
                setEditingZoomAccount(null);
                await loadZoomAccounts();
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.detail || 'Error al guardar cuenta Zoom' });
        } finally {
            setIsSavingZoom(false);
        }
    };

    const handleDeleteZoomAccount = async (accountId) => {
        const name = zoomAccounts.find(a => a.id === accountId)?.name || `Cuenta #${accountId}`;
        const result = await Swal.fire({
            icon: 'warning', title: 'Eliminar cuenta Zoom',
            html: `<p>¿Seguro de eliminar <strong>${name}</strong>?</p><p class="text-sm text-gray-500 mt-2">Las reuniones ya creadas no se verán afectadas.</p>`,
            showCancelButton: true, confirmButtonColor: '#e74c3c', cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
        try {
            await SystemConfigService.deleteZoomAccount(accountId);
            Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Cuenta Zoom eliminada', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, backdrop: false });
            await loadZoomAccounts();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.detail || 'Error al eliminar cuenta Zoom' });
        }
    };

    // ====================================================
    // SMTP handlers
    // ====================================================

    const loadSmtpAccounts = async () => {
        setIsLoadingSMTP(true);
        try {
            const response = await SystemConfigService.getSMTPAccounts();
            if (response.success) {
                setSmtpAccounts(response.data.accounts || []);
                setCanAddMoreSMTP(response.data.can_add_more !== false);
            }
        } catch (error) {
            console.error('Error al cargar cuentas SMTP:', error);
            setSmtpAccounts([]);
        } finally {
            setIsLoadingSMTP(false);
        }
    };

    const handleOpenSmtpCreate = () => {
        setEditingSmtpAccount(null);
        setShowSmtpModal(true);
    };

    const handleOpenSmtpEdit = async (accountId) => {
        try {
            const response = await SystemConfigService.getSMTPAccount(accountId);
            if (response.success) {
                setEditingSmtpAccount({ id: accountId, ...response.data });
                setShowSmtpModal(true);
            }
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la cuenta SMTP' });
        }
    };

    const handleSaveSmtpAccount = async (data) => {
        setIsSavingSMTP(true);
        try {
            const response = editingSmtpAccount
                ? await SystemConfigService.updateSMTPAccount(editingSmtpAccount.id, data)
                : await SystemConfigService.createSMTPAccount(data);

            if (response.success) {
                Swal.fire({
                    icon: 'success', title: 'Éxito',
                    text: editingSmtpAccount ? 'Cuenta SMTP actualizada' : 'Cuenta SMTP creada',
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, backdrop: false
                });
                setShowSmtpModal(false);
                setEditingSmtpAccount(null);
                await loadSmtpAccounts();
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.detail || 'Error al guardar cuenta SMTP' });
        } finally {
            setIsSavingSMTP(false);
        }
    };

    const handleDeleteSmtpAccount = async (accountId) => {
        const name = smtpAccounts.find(a => a.id === accountId)?.name || `Cuenta #${accountId}`;
        const result = await Swal.fire({
            icon: 'warning', title: 'Eliminar cuenta SMTP',
            html: `<p>¿Seguro de eliminar <strong>${name}</strong>?</p><p class="text-sm text-gray-500 mt-2">Los correos pendientes no se verán afectados.</p>`,
            showCancelButton: true, confirmButtonColor: '#e74c3c', cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
        try {
            await SystemConfigService.deleteSMTPAccount(accountId);
            Swal.fire({ icon: 'success', title: 'Eliminada', text: 'Cuenta SMTP eliminada', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, backdrop: false });
            await loadSmtpAccounts();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.detail || 'Error al eliminar cuenta SMTP' });
        }
    };

    const handleResetSmtpLimit = async (accountId) => {
        const name = smtpAccounts.find(a => a.id === accountId)?.name || `Cuenta #${accountId}`;
        const result = await Swal.fire({
            icon: 'question', title: 'Restablecer límite',
            text: `¿Deseas restablecer manualmente el límite diario de "${name}"? Úsalo solo si sabes que la cuenta tiene capacidad disponible.`,
            showCancelButton: true, confirmButtonColor: '#f39c12', cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Restablecer', cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
        try {
            await SystemConfigService.resetSMTPAccountLimit(accountId);
            Swal.fire({ icon: 'success', title: 'Restablecido', text: 'La cuenta SMTP está disponible nuevamente', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, backdrop: false });
            await loadSmtpAccounts();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.detail || 'Error al restablecer límite' });
        }
    };

    const canAddMoreZoomAccounts = zoomAccounts.length < MAX_ZOOM_ACCOUNTS;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <div className="flex items-center gap-2 md:gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0" title="Volver">
                            <ArrowLeft size={20} className="text-gray-600 md:size-6" />
                        </button>
                    )}
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white shadow-lg shrink-0">
                            <Settings size={20} className="md:size-7" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-3xl font-bold text-gray-800 truncate">Configuracion</h1>
                            <p className="text-gray-600 mt-1 text-sm md:text-base hidden sm:block">
                                Gestiona las integraciones y configuraciones del sistema
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sección Zoom ── */}
            <div>
                <div className="mb-4 md:mb-5">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1">Zoom</h2>
                    <p className="text-gray-500 text-sm">Cuentas para reuniones virtuales (máximo {MAX_ZOOM_ACCOUNTS})</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    {canAddMoreZoomAccounts && (
                        <div
                            onClick={handleOpenZoomCreate}
                            className="relative bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:shadow-lg hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center text-center min-h-[320px]"
                        >
                            <div className="relative w-20 h-20 bg-gray-200 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors mb-6">
                                <Plus size={40} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-500 group-hover:text-blue-700 transition-colors">Agregar Cuenta Zoom</h3>
                            <p className="text-sm text-gray-400 group-hover:text-blue-600 mt-2 transition-colors">
                                {zoomAccounts.length === 0 ? 'Configura tu primera cuenta de Zoom' : `${zoomAccounts.length} de ${MAX_ZOOM_ACCOUNTS} cuentas configuradas`}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Sección SMTP ── */}
            <div>
                <div className="mb-4 md:mb-5">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-1">
                        Correo electrónico (SMTP)
                    </h2>
                    <p className="text-gray-500 text-sm">
                        Cuentas Gmail para envío de notificaciones. El sistema cambia automáticamente de cuenta cuando una excede el límite diario.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {smtpAccounts.map((account) => (
                        <SmtpAccountCard
                            key={account.id}
                            accountId={account.id}
                            accountName={account.name}
                            email={account.email}
                            host={account.host}
                            dailyLimit={account.daily_limit}
                            isExceededToday={account.is_exceeded_today}
                            lastUpdated={account.last_exceeded_date || null}
                            onConfigure={() => handleOpenSmtpEdit(account.id)}
                            onDelete={handleDeleteSmtpAccount}
                            onResetLimit={handleResetSmtpLimit}
                            isLoading={isLoadingSMTP}
                        />
                    ))}

                    {/* Tarjeta agregar nueva cuenta SMTP */}
                    {canAddMoreSMTP && (
                        <div
                            onClick={handleOpenSmtpCreate}
                            className="relative bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:shadow-lg hover:border-orange-400 hover:from-orange-50 hover:to-orange-100 transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center text-center min-h-[320px]"
                        >
                            <div className="relative w-20 h-20 bg-gray-200 group-hover:bg-orange-200 rounded-full flex items-center justify-center transition-colors mb-6">
                                <Plus size={40} className="text-gray-400 group-hover:text-orange-600 transition-colors" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-500 group-hover:text-orange-700 transition-colors">
                                Agregar cuenta Gmail
                            </h3>
                            <p className="text-sm text-gray-400 group-hover:text-orange-600 mt-2 transition-colors">
                                {smtpAccounts.length === 0
                                    ? 'Configura tu primera cuenta de correo'
                                    : `${smtpAccounts.length} cuenta(s) configurada(s) · Agregar respaldo`}
                            </p>
                        </div>
                    )}

                    {smtpAccounts.length === 0 && !canAddMoreSMTP && !isLoadingSMTP && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-8 text-center">
                            <p className="text-yellow-700">No hay cuentas SMTP configuradas</p>
                        </div>
                    )}
                </div>

                {/* Banner informativo si hay cuentas excedidas */}
                {smtpAccounts.some(a => a.is_exceeded_today) && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <Mail size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-800">
                                {smtpAccounts.filter(a => a.is_exceeded_today).length === smtpAccounts.length
                                    ? '⚠️ Todas las cuentas han excedido su límite diario'
                                    : `${smtpAccounts.filter(a => a.is_exceeded_today).length} cuenta(s) han excedido su límite hoy`}
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                                {smtpAccounts.filter(a => a.is_exceeded_today).length === smtpAccounts.length
                                    ? 'El sistema no puede enviar correos. Agrega una nueva cuenta Gmail como respaldo.'
                                    : 'El sistema usará automáticamente las cuentas disponibles para los próximos envíos.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Info general */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Lightbulb size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-blue-900 mb-2">Sobre las integraciones</h3>
                        <p className="text-sm text-blue-800">
                            <strong>Zoom</strong>: necesario para reuniones virtuales (hasta {MAX_ZOOM_ACCOUNTS} cuentas para reuniones simultáneas).
                            {' '}<strong>SMTP</strong>: Gmail para notificaciones por correo. Puedes registrar múltiples cuentas;
                            el sistema cambia automáticamente cuando una excede su límite diario (~500 correos con cuenta gratuita, ~2.000 con Workspace).
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal Zoom */}
            <ZoomConfigModal
                isOpen={showZoomModal}
                onClose={() => { setShowZoomModal(false); setEditingZoomAccount(null); }}
                editingAccount={editingZoomAccount}
                onSave={handleSaveZoomAccount}
                isSaving={isSavingZoom}
            />

            {/* Modal SMTP multi-cuenta */}
            <SmtpAccountModal
                isOpen={showSmtpModal}
                onClose={() => { setShowSmtpModal(false); setEditingSmtpAccount(null); }}
                editingAccount={editingSmtpAccount}
                onSave={handleSaveSmtpAccount}
                isSaving={isSavingSMTP}
            />
        </div>
    );
};

export default ConfiguracionTab;
