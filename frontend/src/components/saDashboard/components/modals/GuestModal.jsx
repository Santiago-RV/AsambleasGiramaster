import React from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../common/Modal';
import { UserPlus, Info } from 'lucide-react';

/**
 * Modal para crear invitados (rol 4)
 * Los invitados solo tienen datos básicos y reciben correos con links de asambleas
 */
const GuestModal = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        defaultValues: {
            firstname: '',
            lastname: '',
            email: '',
        },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFormSubmit = (data) => {
        const guestData = {
            firstname: data.firstname.trim(),
            lastname: data.lastname.trim(),
            email: data.email.trim().toLowerCase(),
        };
        
        onSubmit(guestData, () => reset());
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Agregar Invitado a la Unidad"
            size="md"
        >
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Información sobre invitados */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <Info size={18} />
                        Sobre los Invitados
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Solo recibirán correos con links de asambleas</li>
                        <li>• No tendrán acceso a la aplicación</li>
                        <li>• No podrán votar en las asambleas</li>
                    </ul>
                </div>

                {/* Nombres */}
                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        Nombres <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        {...register('firstname', {
                            required: 'Los nombres son obligatorios',
                            minLength: {
                                value: 2,
                                message: 'Los nombres deben tener al menos 2 caracteres',
                            },
                            maxLength: {
                                value: 100,
                                message: 'Los nombres no pueden exceder 100 caracteres',
                            },
                        })}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.firstname ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Ej: Juan Carlos"
                    />
                    {errors.firstname && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.firstname.message}
                        </p>
                    )}
                </div>

                {/* Apellidos */}
                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        Apellidos <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        {...register('lastname', {
                            required: 'Los apellidos son obligatorios',
                            minLength: {
                                value: 2,
                                message: 'Los apellidos deben tener al menos 2 caracteres',
                            },
                            maxLength: {
                                value: 100,
                                message: 'Los apellidos no pueden exceder 100 caracteres',
                            },
                        })}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.lastname ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Ej: Pérez García"
                    />
                    {errors.lastname && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.lastname.message}
                        </p>
                    )}
                </div>

                {/* Correo Electrónico */}
                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        Correo Electrónico <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        {...register('email', {
                            required: 'El correo electrónico es obligatorio',
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Correo electrónico inválido',
                            },
                        })}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="invitado@ejemplo.com"
                    />
                    {errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.email.message}
                        </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                        A este correo se enviarán los links de las asambleas
                    </p>
                </div>

                {/* Botones */}
                <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`flex items-center gap-2 bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {isSubmitting ? (
                            <>
                                <svg
                                    className="animate-spin h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Creando...
                            </>
                        ) : (
                            <>
                                <UserPlus size={20} />
                                Crear Invitado
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default GuestModal;