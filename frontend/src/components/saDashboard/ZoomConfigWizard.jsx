import React, { useState } from 'react';
import { Video, ArrowRight, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import ZoomConfigForm from './ZoomConfigForm';
import Swal from 'sweetalert2';
import SystemConfigService from '../../services/api/SystemConfigService';

const ZoomConfigWizard = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [isConfiguring, setIsConfiguring] = useState(false);

    const handleSaveConfig = async (credentials) => {
        setIsConfiguring(true);
        try {
            const response = await SystemConfigService.updateZoomConfig(credentials);
            
            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Configuración Completada!',
                    text: 'Las credenciales de Zoom han sido guardadas exitosamente',
                    confirmButtonText: 'Continuar',
                    confirmButtonColor: '#27ae60'
                });
                
                onComplete();
            } else {
                throw new Error(response.message || 'Error al guardar configuración');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.detail || error.message || 'Error al guardar la configuración'
            });
        } finally {
            setIsConfiguring(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-6">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-4 shadow-lg">
                        <Video size={40} />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        Configuración Inicial de Zoom
                    </h1>
                    <p className="text-lg text-gray-600">
                        Configura las credenciales de Zoom para habilitar las reuniones virtuales
                    </p>
                </div>

                <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${
                                step >= 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'
                            }`}>
                                {step > 1 ? <CheckCircle size={20} /> : '1'}
                            </div>
                            <span className="font-semibold hidden sm:inline">Introducción</span>
                        </div>
                        <div className="w-12 h-0.5 bg-gray-300"></div>
                        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${
                                step >= 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'
                            }`}>
                                2
                            </div>
                            <span className="font-semibold hidden sm:inline">Configuración</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <h3 className="font-bold text-lg text-blue-800 mb-3 flex items-center gap-2">
                                    <AlertCircle size={24} />
                                    Antes de Comenzar
                                </h3>
                                <p className="text-blue-700 mb-4">
                                    Necesitarás las credenciales de tu aplicación Zoom. Si aún no tienes una, sigue estos pasos:
                                </p>
                                <ol className="list-decimal list-inside space-y-2 text-blue-700 ml-4">
                                    <li>Accede al <a href="https://marketplace.zoom.us/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-900">Zoom App Marketplace</a></li>
                                    <li>Crea una aplicación del tipo "Server-to-Server OAuth"</li>
                                    <li>También crea una aplicación del tipo "Meeting SDK"</li>
                                    <li>Copia las credenciales que necesitarás en el siguiente paso</li>
                                </ol>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="border border-gray-200 rounded-lg p-6">
                                    <h4 className="font-bold text-gray-800 mb-3">📱 Meeting SDK</h4>
                                    <p className="text-sm text-gray-600 mb-3">Necesitarás:</p>
                                    <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• SDK Key (público)</li>
                                        <li>• SDK Secret (privado)</li>
                                    </ul>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-6">
                                    <h4 className="font-bold text-gray-800 mb-3">🔐 Server-to-Server OAuth</h4>
                                    <p className="text-sm text-gray-600 mb-3">Necesitarás:</p>
                                    <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• Account ID</li>
                                        <li>• Client ID</li>
                                        <li>• Client Secret</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                                >
                                    Continuar
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                                Ingresa tus Credenciales de Zoom
                            </h3>
                            <ZoomConfigForm 
                                onSave={handleSaveConfig}
                                onCancel={() => setStep(1)}
                                isSaving={isConfiguring}
                                showTestButton={true}
                            />
                        </div>
                    )}
                </div>

                {step === 1 && (
                    <div className="text-center mt-6">
                        <a
                            href="https://developers.zoom.us/docs/meeting-sdk/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-2"
                        >
                            <ExternalLink size={18} />
                            Ver Documentación de Zoom
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ZoomConfigWizard;
