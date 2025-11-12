import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useResidentialCode } from "../../hooks/useResidentialCode";
import { ResidentialUnitService } from "../../services/api/ResidentialUnitService";
import Swal from "sweetalert2";

const ClientsSection = () => {
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      str_name: "",
      str_nit: "",
      int_total_apartments: "",
      str_unit_type: "Conjunto Residencial",
      str_address: "",
      str_city: "",
      str_state: "",
      int_max_concurrent_meetings: 5,
      bln_is_active: true,
    },
  });

  // Watch los campos necesarios para generar el código
  const watchName = watch("str_name");
  const watchNit = watch("str_nit");
  const watchApartments = watch("int_total_apartments");

  // Generar código automáticamente
  const residentialCode = useResidentialCode(
    watchName,
    watchNit,
    watchApartments
  );

  // Query para obtener las unidades residenciales del backend
  const {
    data: unidadesData,
    isLoading: isLoadingUnits,
    isError: isErrorUnits,
    error: errorUnits,
  } = useQuery({
    queryKey: ["residentialUnits"],
    queryFn: ResidentialUnitService.getResidentialUnits,
    select: (response) => response.data || [],
  });

  // Mutación para crear unidad residencial
  const createResidentialUnitMutation = useMutation({
    mutationFn: ResidentialUnitService.createResidentialUnit,
    onSuccess: (response) => {
      // Invalidar la query para refrescar la lista desde el backend
      queryClient.invalidateQueries({ queryKey: ["residentialUnits"] });
      
      // Limpiar formulario
      reset();
      
      // Notificación de éxito con SweetAlert2
      Swal.fire({
        icon: "success",
        title: "¡Éxito!",
        text: response.message || "Unidad residencial creada exitosamente",
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: "top-end",
      });
    },
    onError: (error) => {
      // Notificación de error
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al crear la unidad residencial",
        showConfirmButton: true,
        confirmButtonColor: "#3498db",
      });
    },
  });

  const onSubmit = (data) => {
    // Preparar los datos con el código generado
    const unitData = {
      str_residential_code: residentialCode,
      str_name: data.str_name,
      str_nit: data.str_nit,
      str_unit_type: data.str_unit_type,
      int_total_apartments: parseInt(data.int_total_apartments),
      str_address: data.str_address,
      str_city: data.str_city,
      str_state: data.str_state,
      bln_is_active: data.bln_is_active,
      int_max_concurrent_meetings: parseInt(data.int_max_concurrent_meetings),
    };

    // Ejecutar la mutación
    createResidentialUnitMutation.mutate(unitData);
  };


  const handleDelete = (id) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#3498db",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        // TODO: Implementar eliminación en el backend
        // Por ahora solo mostramos un mensaje
        Swal.fire({
          icon: "info",
          title: "Funcionalidad en desarrollo",
          text: "La eliminación se implementará próximamente",
          showConfirmButton: true,
          confirmButtonColor: "#3498db",
        });
      }
    });
  };

  return (
    <section id="clients" className="p-8 ml-[280px] min-h-screen bg-[#f5f7fa] animate-fadeIn">
      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold text-[#2c3e50] mb-6 border-b-2 border-gray-200 pb-2">
          Crear Nueva Unidad Residencial
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Código generado automáticamente - Solo lectura */}
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <label className="block mb-2 font-semibold text-gray-700">
              Código de Unidad Residencial (Generado Automáticamente)
            </label>
            <input
              type="text"
              value={residentialCode}
              readOnly
              className="w-full p-3 border-2 border-blue-300 rounded-lg text-lg font-mono bg-blue-100 text-blue-800 cursor-not-allowed"
              placeholder="Se genera automáticamente al llenar el formulario"
            />
            <p className="text-sm text-gray-600 mt-2">
              Este código se genera automáticamente basado en el nombre, NIT y número de apartamentos
            </p>
          </div>

          <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {/* Nombre de la Unidad */}
            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Nombre de la Unidad Residencial *
              </label>
              <input
                type="text"
                {...register("str_name", {
                  required: "El nombre es obligatorio",
                  minLength: { value: 3, message: "Mínimo 3 caracteres" },
                })}
                placeholder="Ej: Torres del Parque"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
              {errors.str_name && (
                <span className="text-red-500 text-sm">{errors.str_name.message}</span>
              )}
            </div>

            {/* NIT */}
            <div>
              <label className="block mb-2 font-semibold text-gray-600">NIT *</label>
              <input
                type="text"
                {...register("str_nit", {
                  required: "El NIT es obligatorio",
                  pattern: {
                    value: /^[0-9-]+$/,
                    message: "NIT inválido (solo números y guiones)",
                  },
                })}
                placeholder="Ej: 900123456-7"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
              {errors.str_nit && (
                <span className="text-red-500 text-sm">{errors.str_nit.message}</span>
              )}
            </div>

            {/* Tipo de Unidad */}
            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Tipo de Unidad *
              </label>
              <select
                {...register("str_unit_type", { required: "El tipo es obligatorio" })}
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              >
                <option value="Conjunto Residencial">Conjunto Residencial</option>
                <option value="Edificio">Edificio</option>
                <option value="Condominio">Condominio</option>
                <option value="Urbanización">Urbanización</option>
              </select>
              {errors.str_unit_type && (
                <span className="text-red-500 text-sm">{errors.str_unit_type.message}</span>
              )}
            </div>

            {/* Número de Apartamentos */}
            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Número de Apartamentos *
              </label>
              <input
                type="number"
                {...register("int_total_apartments", {
                  required: "El número de apartamentos es obligatorio",
                  min: { value: 1, message: "Mínimo 1 apartamento" },
                })}
                placeholder="Ej: 120"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
              {errors.int_total_apartments && (
                <span className="text-red-500 text-sm">
                  {errors.int_total_apartments.message}
                </span>
              )}
            </div>

            {/* Ciudad */}
            <div>
              <label className="block mb-2 font-semibold text-gray-600">Ciudad *</label>
              <input
                type="text"
                {...register("str_city", { required: "La ciudad es obligatoria" })}
                placeholder="Ej: Medellín"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
              {errors.str_city && (
                <span className="text-red-500 text-sm">{errors.str_city.message}</span>
              )}
            </div>

            {/* Departamento/Estado */}
            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Departamento/Estado *
              </label>
              <input
                type="text"
                {...register("str_state", { required: "El departamento es obligatorio" })}
                placeholder="Ej: Antioquia"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
              {errors.str_state && (
                <span className="text-red-500 text-sm">{errors.str_state.message}</span>
              )}
            </div>

            {/* Dirección */}
            <div>
              <label className="block mb-2 font-semibold text-gray-600">Dirección *</label>
              <input
                type="text"
                {...register("str_address", { required: "La dirección es obligatoria" })}
                placeholder="Ej: Carrera 15 # 25-30"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
              {errors.str_address && (
                <span className="text-red-500 text-sm">{errors.str_address.message}</span>
              )}
            </div>

            {/* Máximo de Reuniones Concurrentes */}
            <div>
              <label className="block mb-2 font-semibold text-gray-600">
                Máximo de Reuniones Concurrentes *
              </label>
              <input
                type="number"
                {...register("int_max_concurrent_meetings", {
                  required: "Este campo es obligatorio",
                  min: { value: 1, message: "Mínimo 1 reunión" },
                })}
                placeholder="Ej: 5"
                className="w-full p-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#3498db]"
              />
              {errors.int_max_concurrent_meetings && (
                <span className="text-red-500 text-sm">
                  {errors.int_max_concurrent_meetings.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-6">
            <button
              type="submit"
              disabled={createResidentialUnitMutation.isPending}
              className={`bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all ${
                createResidentialUnitMutation.isPending
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {createResidentialUnitMutation.isPending ? (
                <span className="flex items-center gap-2">
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
                  Guardando...
                </span>
              ) : (
                "Guardar Unidad Residencial"
              )}
            </button>

            <button
              type="button"
              onClick={() => reset()}
              disabled={createResidentialUnitMutation.isPending}
              className="bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white font-semibold px-6 py-3 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Limpiar Formulario
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#2c3e50]">
            Lista de Unidades Residenciales
          </h3>
          {isLoadingUnits && (
            <span className="text-sm text-gray-500">Cargando...</span>
          )}
        </div>

        <div className="overflow-x-auto">
          {isErrorUnits ? (
            <div className="p-8 text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <svg
                  className="mx-auto h-12 w-12 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-red-900">
                  Error al cargar las unidades residenciales
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {errorUnits?.message || "Ocurrió un error inesperado"}
                </p>
              </div>
            </div>
          ) : isLoadingUnits ? (
            <div className="p-8 text-center">
              <svg
                className="animate-spin h-12 w-12 text-blue-500 mx-auto"
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
              <p className="mt-4 text-gray-600">Cargando unidades residenciales...</p>
            </div>
          ) : !unidadesData || unidadesData.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  No hay unidades residenciales
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Comienza creando una nueva unidad residencial usando el formulario de arriba.
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Código",
                    "Unidad Residencial",
                    "Ciudad",
                    "Departamento",
                    "Apartamentos",
                    "Tipo",
                    "Estado",
                    "Acciones",
                  ].map((head) => (
                    <th
                      key={head}
                      className="p-4 text-left font-semibold text-[#2c3e50] border-b border-gray-200"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {unidadesData.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-4 font-mono text-sm">{u.str_residential_code}</td>
                    <td className="p-4 font-medium">{u.str_name}</td>
                    <td className="p-4">{u.str_city}</td>
                    <td className="p-4">{u.str_state}</td>
                    <td className="p-4 text-center">{u.int_total_apartments}</td>
                    <td className="p-4">{u.str_unit_type || "N/A"}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          u.bln_is_active
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {u.bln_is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <button className="bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="bg-gradient-to-br from-[#e74c3c] to-[#c0392b] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all"
                        >
                          Borrar
                        </button>
                        <button className="bg-gradient-to-br from-[#27ae60] to-[#229954] text-white font-semibold px-4 py-2 rounded-md hover:-translate-y-0.5 hover:shadow-md transition-all">
                          Informe
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;
