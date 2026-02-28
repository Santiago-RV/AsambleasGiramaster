// frontend/src/components/saDashboard/components/modals/SupportModal.jsx
import React, { useEffect, useState } from 'react';
import { Headphones, X, Save, Trash2, Loader2, User, Mail, Phone } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupportService } from '../../../../services/api/SupportService';
import Swal from 'sweetalert2';

/**
 * Modal para gestionar el contacto de soporte técnico de una unidad residencial.
 * Reutilizable en SuperAdmin y Admin.
 *
 * Props:
 *  - isOpen      {boolean}  Controla visibilidad del modal
 *  - onClose     {function} Cierra el modal
 *  - unitId      {number}   ID de la unidad residencial
 *  - unitName    {string}   Nombre de la unidad (para mostrar en el header)
 */
const SupportModal = ({ isOpen, onClose, unitId, unitName }) => {
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        str_support_name: '',
        str_support_email: '',
        str_support_phone: '',
    });

    const [errors, setErrors] = useState({});

    // ── Query: obtener datos actuales de soporte ─────────────────────────────
    const {
        data: supportData,
        isLoading: isLoadingSupport,
        isFetching,
    } = useQuery({
        queryKey: ['support-info', unitId],
        queryFn: () => SupportService.getSupportInfo(unitId),
        enabled: isOpen && !!unitId,
        retry: 1,
    });

    // Prefill del formulario cuando llegan datos
    useEffect(() => {
        if (supportData?.data) {
            const d = supportData.data;
            setForm({
                str_support_name: d.str_support_name || '',
                str_support_email: d.str_support_email || '',
                str_support_phone: d.str_support_phone || '',
            });
        } else if (!isLoadingSupport) {
            setForm({ str_support_name: '', str_support_email: '', str_support_phone: '' });
        }
    }, [supportData, isLoadingSupport]);

    // Limpiar errores y form al cerrar
    useEffect(() => {
        if (!isOpen) {
            setErrors({});
        }
    }, [isOpen]);

    // ── Mutation: guardar (upsert) ────────────────────────────────────────────
    const upsertMutation = useMutation({
        mutationFn: (data) => SupportService.upsertSupportInfo(unitId, data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['support-info', unitId] });
            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: res?.message || 'Contacto de soporte guardado exitosamente',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                backdrop: false,
            });
            onClose();
        },
        onError: (error) => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error?.response?.data?.detail || 'No se pudo guardar el contacto de soporte',
                confirmButtonColor: '#6B4C9A',
            });
        },
    });

    // ── Mutation: eliminar ────────────────────────────────────────────────────
    const deleteMutation = useMutation({
        mutationFn: () => SupportService.deleteSupportInfo(unitId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-info', unitId] });
            setForm({ str_support_name: '', str_support_email: '', str_support_phone: '' });
            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'Contacto de soporte eliminado correctamente',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                backdrop: false,
            });
            onClose();
        },
        onError: (error) => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error?.response?.data?.detail || 'No se pudo eliminar el contacto de soporte',
                confirmButtonColor: '#6B4C9A',
            });
        },
    });

    // ── Validación ────────────────────────────────────────────────────────────
    const validate = () => {
        const newErrors = {};
        if (!form.str_support_name.trim()) {
            newErrors.str_support_name = 'El nombre es requerido';
        }
        if (!form.str_support_email.trim()) {
            newErrors.str_support_email = 'El correo es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.str_support_email)) {
            newErrors.str_support_email = 'Correo inválido';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = () => {
        if (!validate()) return;
        upsertMutation.mutate({
            str_support_name: form.str_support_name.trim(),
            str_support_email: form.str_support_email.trim(),
            str_support_phone: form.str_support_phone.trim() || null,
        });
    };

    const handleDelete = () => {
        Swal.fire({
            title: '¿Eliminar contacto de soporte?',
            html: `Se eliminará el contacto de soporte de <strong>${unitName}</strong>.<br/>
				<small style="color:#6b7280">Esta información dejará de aparecer en los correos de credenciales.</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
        }).then((result) => {
            if (result.isConfirmed) deleteMutation.mutate();
        });
    };

    const hasExistingSupport = !!supportData?.data;
    const isWorking = upsertMutation.isPending || deleteMutation.isPending;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* Header */}
                <div className="bg-linear-to-r from-orange-500 to-orange-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Headphones size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg leading-tight">
                                    Soporte Técnico
                                </h2>
                                {unitName && (
                                    <p className="text-orange-100 text-xs mt-0.5 truncate max-w-55">
                                        {unitName}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* Descripción */}
                <div className="bg-orange-50 border-b border-orange-100 px-6 py-3">
                    <p className="text-orange-800 text-sm leading-relaxed">
                        Este contacto aparecerá al pie del correo de credenciales para que
                        los copropietarios puedan comunicarse en caso de dudas.
                    </p>
                </div>

                {/* Contenido */}
                <div className="px-6 py-5 space-y-4">
                    {isLoadingSupport || isFetching ? (
                        <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
                            <Loader2 size={22} className="animate-spin text-orange-500" />
                            <span className="text-sm">Cargando información...</span>
                        </div>
                    ) : (
                        <>
                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <User size={14} className="text-orange-500" />
                                        Nombre del contacto <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="str_support_name"
                                    value={form.str_support_name}
                                    onChange={handleChange}
                                    placeholder="Ej: Juan Pérez"
                                    className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400
										${errors.str_support_name
                                            ? 'border-red-400 bg-red-50'
                                            : 'border-gray-300 focus:border-orange-400'
                                        }`}
                                />
                                {errors.str_support_name && (
                                    <p className="mt-1 text-xs text-red-500">{errors.str_support_name}</p>
                                )}
                            </div>

                            {/* Correo */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <Mail size={14} className="text-orange-500" />
                                        Correo electrónico <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="email"
                                    name="str_support_email"
                                    value={form.str_support_email}
                                    onChange={handleChange}
                                    placeholder="soporte@ejemplo.com"
                                    className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400
										${errors.str_support_email
                                            ? 'border-red-400 bg-red-50'
                                            : 'border-gray-300 focus:border-orange-400'
                                        }`}
                                />
                                {errors.str_support_email && (
                                    <p className="mt-1 text-xs text-red-500">{errors.str_support_email}</p>
                                )}
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    <span className="flex items-center gap-1.5">
                                        <Phone size={14} className="text-orange-500" />
                                        Teléfono <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                                    </span>
                                </label>
                                <input
                                    type="tel"
                                    name="str_support_phone"
                                    value={form.str_support_phone}
                                    onChange={handleChange}
                                    placeholder="Ej: +57 300 123 4567"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer con botones */}
                {!isLoadingSupport && (
                    <div className="px-6 pb-6 flex flex-col gap-3">
                        {/* Botón guardar */}
                        <button
                            onClick={handleSubmit}
                            disabled={isWorking}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {upsertMutation.isPending ? (
                                <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                            ) : (
                                <><Save size={16} /> {hasExistingSupport ? 'Actualizar contacto' : 'Guardar contacto'}</>
                            )}
                        </button>

                        {/* Botón eliminar (solo si ya existe) */}
                        {hasExistingSupport && (
                            <button
                                onClick={handleDelete}
                                disabled={isWorking}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {deleteMutation.isPending ? (
                                    <><Loader2 size={16} className="animate-spin" /> Eliminando...</>
                                ) : (
                                    <><Trash2 size={16} /> Eliminar contacto</>
                                )}
                            </button>
                        )}

                        {/* Cancelar */}
                        <button
                            onClick={onClose}
                            disabled={isWorking}
                            className="w-full px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupportModal;