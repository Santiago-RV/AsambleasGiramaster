import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../../common/Modal';
import { Plus, Edit, Lightbulb } from 'lucide-react';

const ResidentModal = ({
    isOpen,
    onClose,
    onSubmit,
    mode = 'create', // 'create' o 'edit'
    resident = null,
    isSubmitting,
}) => {
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        defaultValues: {
            firstname: '',
            lastname: '',
            username: '',
            email: '',
            phone: '',
            apartment_number: '',
            voting_weight: '',
            is_active: true,
            password: '',
        },
    });

    // Resetear el formulario cuando cambia el modo o se abre/cierra el modal
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && resident) {
                // Modo edición: cargar datos del residente
                reset({
                    firstname: resident.firstname || '',
                    lastname: resident.lastname || '',
                    username: resident.username || '',
                    email: resident.email || '',
                    phone: resident.phone || '',
                    apartment_number: resident.apartment_number || '',
                    voting_weight: resident.voting_weight || '',
                    is_active: resident.is_active !== undefined
                        ? resident.is_active
                        : (resident.bln_allow_entry !== undefined ? resident.bln_allow_entry : true),
                    password: '',
                });
            } else {
                // Modo creación: valores por defecto
                reset({
                    firstname: '',
                    lastname: '',
                    username: '',
                    email: '',
                    phone: '',
                    apartment_number: '',
                    voting_weight: '',
                    is_active: true,
                    password: '',
                });
            }
        }
    }, [isOpen, mode, resident, reset]);

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFormSubmit = (data) => {
        if (mode === 'create') {
            const residentData = {
                firstname: data.firstname,
                lastname: data.lastname,
                username: data.username,
                email: data.email,
                phone: data.phone || null,
                apartment_number: data.apartment_number,
                is_active: data.is_active,
                password: data.password || 'Temporal123!',
                voting_weight: data.voting_weight || 0.0,
            };
            onSubmit(residentData, null, () => reset());  // Agregar null como segundo parámetro
        } else {
            // Modo editar - solo enviar campos modificados
            const residentData = {};

            if (data.firstname !== resident.firstname) {
                residentData.firstname = data.firstname;
            }
            if (data.lastname !== resident.lastname) {
                residentData.lastname = data.lastname;
            }
            if (data.email !== resident.email) {
                residentData.email = data.email;
            }
            if (data.phone !== resident.phone) {
                residentData.phone = data.phone || null;
            }
            if (data.apartment_number !== resident.apartment_number) {
                residentData.apartment_number = data.apartment_number;
            }
            if (data.is_active !== resident.is_active) {
                residentData.is_active = data.is_active;
            }
            if (data.voting_weight !== resident.voting_weight) {
                residentData.voting_weight = data.voting_weight || 0.0;
            }
            if (data.password && data.password.trim() !== '') {
                residentData.password = data.password;
            }

            onSubmit(residentData, resident.id, () => reset());  
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                mode === 'create'
                    ? 'Agregar Nuevo Copropietario'
                    : 'Editar Copropietario'
            }
            size="lg"
        >
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    {/* Nombre */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            {...register('firstname', {
                                required: 'El nombre es obligatorio',
                                minLength: {
                                    value: 2,
                                    message: 'Mínimo 2 caracteres',
                                },
                            })}
                            placeholder="Ej: Juan"
                            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                        />
                        {errors.firstname && (
                            <span className="text-red-500 text-sm">
                                {errors.firstname.message}
                            </span>
                        )}
                    </div>

                    {/* Apellido */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700">
                            Apellido *
                        </label>
                        <input
                            type="text"
                            {...register('lastname', {
                                required: 'El apellido es obligatorio',
                                minLength: {
                                    value: 2,
                                    message: 'Mínimo 2 caracteres',
                                },
                            })}
                            placeholder="Ej: Pérez"
                            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                        />
                        {errors.lastname && (
                            <span className="text-red-500 text-sm">
                                {errors.lastname.message}
                            </span>
                        )}
                    </div>

                    {/* Usuario */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700">
                            Usuario *
                        </label>
                        <input
                            type="text"
                            {...register('username', {
                                required: 'El usuario es obligatorio',
                                minLength: {
                                    value: 3,
                                    message: 'Mínimo 3 caracteres',
                                },
                            })}
                            placeholder="Ej: juan.perez"
                            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                            disabled={mode === 'edit'}
                        />
                        {errors.username && (
                            <span className="text-red-500 text-sm">
                                {errors.username.message}
                            </span>
                        )}
                        {mode === 'edit' && (
                            <p className="text-xs text-gray-500 mt-1">
                                El usuario no se puede modificar
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700">
                            Email *
                        </label>
                        <input
                            type="email"
                            {...register('email', {
                                required: 'El email es obligatorio',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Email inválido',
                                },
                            })}
                            placeholder="Ej: juan@example.com"
                            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                        />
                        {errors.email && (
                            <span className="text-red-500 text-sm">
                                {errors.email.message}
                            </span>
                        )}
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700">
                            Teléfono
                        </label>
                        <input
                            type="text"
                            {...register('phone')}
                            placeholder="Ej: +57 300 123 4567"
                            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                        />
                    </div>

                    {/* Apartamento */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700">
                            Número de Apartamento *
                        </label>
                        <input
                            type="text"
                            {...register('apartment_number', {
                                required: 'El número de apartamento es obligatorio',
                            })}
                            placeholder="Ej: 101"
                            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                        />
                        {errors.apartment_number && (
                            <span className="text-red-500 text-sm">
                                {errors.apartment_number.message}
                            </span>
                        )}
                    </div>
                </div>

                {/* Peso de Votación */}
                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        Peso de Votación (Coeficiente)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        {...register('voting_weight')}
                        placeholder="Ej: 0.25 (25%)"
                        className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        <Lightbulb size={14} className="inline mr-1" />
                        Coeficiente de copropiedad (ej: 0.25 = 25%). Dejar vacío para 0.0
                    </p>
                </div>

                {/* Contraseña */}
                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        {mode === 'create'
                            ? 'Contraseña *'
                            : 'Nueva Contraseña (opcional)'}
                    </label>
                    <input
                        type="password"
                        {...register('password', {
                            validate: (value) => {
                                // En modo edición, la contraseña es opcional
                                if (mode === 'edit') {
                                    if (!value || value.trim() === '') {
                                        return true; // Válido si está vacío
                                    }
                                    if (value.length < 8) {
                                        return 'La contraseña debe tener mínimo 8 caracteres';
                                    }
                                    return true;
                                }
                                // En modo crear, la contraseña es obligatoria
                                if (!value || value.trim() === '') {
                                    return 'La contraseña es obligatoria';
                                }
                                if (value.length < 8) {
                                    return 'La contraseña debe tener mínimo 8 caracteres';
                                }
                                return true;
                            },
                        })}
                        placeholder={
                            mode === 'create'
                                ? 'Contraseña inicial del copropietario'
                                : 'Dejar en blanco para mantener la actual'
                        }
                        className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
                    />
                    {errors.password && (
                        <span className="text-red-500 text-sm">
                            {errors.password.message}
                        </span>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                        <Lightbulb size={14} className="inline mr-1" />
                        {mode === 'create'
                            ? 'Si no especificas una contraseña, se usará: Temporal123!'
                            : 'Solo se actualizará si proporcionas una nueva contraseña'}
                    </p>
                </div>

                {/* Estado activo */}
                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            {...register('is_active')}
                            className="w-5 h-5 text-[#3498db] border-gray-300 rounded focus:ring-[#3498db]"
                        />
                        <span className="font-semibold text-gray-700">Activo</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-1 ml-8">
                        Los copropietarios activos pueden iniciar sesión en el sistema
                    </p>
                </div>

                {/* Botones */}
                <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`flex items-center gap-2 bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
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
                                {mode === 'create' ? 'Creando...' : 'Guardando...'}
                            </>
                        ) : (
                            <>
                                {mode === 'create' ? <Plus size={20} /> : <Edit size={20} />}
                                {mode === 'create'
                                    ? 'Crear Copropietario'
                                    : 'Guardar Cambios'}
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

export default ResidentModal;