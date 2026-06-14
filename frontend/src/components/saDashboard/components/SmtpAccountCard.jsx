import React from 'react';
import { Mail, CheckCircle, AlertCircle, AlertTriangle, Settings, Edit, Trash2, RotateCcw } from 'lucide-react';
import { formatDateLong } from '../../../utils/dateUtils';

const SmtpAccountCard = ({
    accountId,
    accountName,
    email,
    host,
    dailyLimit,
    isExceededToday,
    lastUpdated,
    onConfigure,
    onDelete,
    onResetLimit,
    isLoading,
}) => {
    const statusBadge = () => {
        if (isLoading) {
            return (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-full">
                    <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Verificando...</span>
                </div>
            );
        }
        if (isExceededToday) {
            return (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 border-2 border-red-300 rounded-full">
                    <AlertTriangle size={18} className="text-red-600" />
                    <span className="text-sm font-semibold text-red-700">Límite excedido hoy</span>
                </div>
            );
        }
        if (email) {
            return (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 border-2 border-green-300 rounded-full">
                    <CheckCircle size={18} className="text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Activa</span>
                </div>
            );
        }
        return (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 border-2 border-yellow-300 rounded-full">
                <AlertCircle size={18} className="text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-700">Sin credenciales</span>
            </div>
        );
    };

    const cardBorder = isExceededToday
        ? 'border-red-300 from-red-50 to-orange-50 hover:border-red-400'
        : 'border-orange-200 from-orange-50 to-orange-100 hover:border-orange-300';

    const iconBg = isExceededToday
        ? 'from-red-500 to-red-600'
        : 'from-orange-500 to-orange-600';

    const btnBg = isExceededToday
        ? 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
        : 'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800';

    return (
        <div
            className={`relative bg-gradient-to-br ${cardBorder} border-2 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group`}
            onClick={onConfigure}
        >
            {/* Acciones rápidas (hover) */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {isExceededToday && onResetLimit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onResetLimit(accountId); }}
                        className="p-2 bg-white/90 hover:bg-yellow-50 border border-gray-200 hover:border-yellow-300 rounded-lg transition-all"
                        title="Restablecer límite"
                    >
                        <RotateCcw size={15} className="text-yellow-600" />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(accountId); }}
                        className="p-2 bg-white/90 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg transition-all"
                        title="Eliminar cuenta"
                    >
                        <Trash2 size={15} className="text-gray-400 hover:text-red-500" />
                    </button>
                )}
            </div>

            <div className="flex flex-col items-center text-center space-y-5">
                {/* Ícono */}
                <div className="relative">
                    <div className={`absolute inset-0 ${isExceededToday ? 'bg-red-400' : 'bg-orange-400'} rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity`} />
                    <div className={`relative w-24 h-24 bg-gradient-to-br ${iconBg} rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Mail size={48} className="text-white" strokeWidth={2} />
                    </div>
                </div>

                {/* Nombre y cuenta */}
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-800 leading-tight">
                        {accountName || `Cuenta SMTP #${accountId}`}
                    </h3>
                    <p className="text-xs text-gray-500">Cuenta #{accountId} · {host || 'smtp.gmail.com'}</p>
                    {email && (
                        <p className="text-xs text-gray-400 font-mono">{email}</p>
                    )}
                </div>

                {/* Badge de estado */}
                <div className="w-full flex justify-center">
                    {statusBadge()}
                </div>

                {/* Info límite diario */}
                {dailyLimit && (
                    <p className="text-xs text-gray-500">
                        Límite diario: <span className="font-semibold">{dailyLimit} correos</span>
                        {isExceededToday && <span className="text-red-600 ml-1">(excedido)</span>}
                    </p>
                )}

                {lastUpdated && (
                    <p className="text-xs text-gray-400">
                        Actualizada: {formatDateLong(lastUpdated)}
                    </p>
                )}

                {/* Botón principal */}
                <button
                    onClick={(e) => { e.stopPropagation(); onConfigure(); }}
                    disabled={isLoading}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r ${btnBg} text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105`}
                >
                    <Edit size={17} />
                    Editar cuenta
                </button>
            </div>

            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
        </div>
    );
};

export default SmtpAccountCard;
