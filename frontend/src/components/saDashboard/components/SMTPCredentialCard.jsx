import React from 'react';
import { Mail, CheckCircle, AlertCircle, Settings, Edit } from 'lucide-react';

const SMTPCredentialCard = ({ isConfigured, lastUpdated, onConfigure, isLoading }) => {
    return (
        <div 
            className="relative bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl p-8 hover:shadow-2xl hover:border-orange-300 transition-all duration-300 cursor-pointer group"
            onClick={onConfigure}
        >
            {/* Ícono principal */}
            <div className="flex flex-col items-center text-center space-y-6">
                {/* Ícono grande con animación */}
                <div className="relative">
                    <div className="absolute inset-0 bg-orange-400 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Mail size={48} className="text-white" strokeWidth={2} />
                    </div>
                </div>

                {/* Título */}
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-800">
                        Configuración SMTP
                    </h3>
                    <p className="text-sm text-gray-600">
                        Servidor de correo electrónico
                    </p>
                </div>

                {/* Badge de Estado */}
                <div className="w-full">
                    {isLoading ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-full">
                            <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Verificando...</span>
                        </div>
                    ) : isConfigured ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 border-2 border-green-300 rounded-full">
                            <CheckCircle size={20} className="text-green-600" />
                            <span className="text-sm font-semibold text-green-700">Configurado</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 border-2 border-yellow-300 rounded-full">
                            <AlertCircle size={20} className="text-yellow-600" />
                            <span className="text-sm font-semibold text-yellow-700">No Configurado</span>
                        </div>
                    )}
                </div>

                {/* Información adicional */}
                {lastUpdated && (
                    <p className="text-xs text-gray-500">
                        Última actualización: {new Date(lastUpdated).toLocaleDateString('es-ES')}
                    </p>
                )}

                {/* Botón de acción */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onConfigure();
                    }}
                    disabled={isLoading}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-lg hover:from-orange-700 hover:to-orange-800 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105"
                >
                    {isConfigured ? (
                        <>
                            <Edit size={18} />
                            Editar Configuración
                        </>
                    ) : (
                        <>
                            <Settings size={18} />
                            Configurar Ahora
                        </>
                    )}
                </button>
            </div>

            {/* Efecto de brillo en hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
        </div>
    );
};

export default SMTPCredentialCard;
