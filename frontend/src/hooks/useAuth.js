import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../services/api/AuthService";
import { useAuthContext } from "../providers/AuthProvider";
import Swal from "sweetalert2";

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateUser } = useAuthContext();

  const loginMutation = useMutation({
    mutationFn: (credentials) => AuthService.login(credentials),
    onSuccess: (data) => {
      if (!data.success) {
        throw new Error(data.message || 'Error en la respuesta del servidor');
      }

      if (!data.data.user || !data.data.user.username || !data.data.user.role || !data.data.user.id) {
        throw new Error('Datos de usuario incompletos');
      }

      const userData = {
        id: data.data.user.id,
        username: data.data.user.username,
        role: data.data.user.role,
      }
      updateUser(userData);

      // Limpiar el cache de la query
      queryClient.clear();

      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: 'Inicio de Sesión Exitoso',
        text: data.message || 'Bienvenido al sistema',
        timer: 2000,
        showConfirmButton: false,
      });

      navigate('/');
    },
    onError: (error) => {
      console.error('Error al iniciar sesión:', error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data) => AuthService.register(data),
    onSuccess: () => {
      Swal.fire({
        icon: 'success',
        title: 'Registro Exitoso',
        text: 'Tu cuenta ha sido creada correctamente',
        confirmButtonColor: '#2563eb',
      });
      navigate('/login');
    },
    onError: (error) => {
      console.error('Error al registrar:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al Registrar',
        text: error.message || 'No se pudo completar el registro',
        confirmButtonColor: '#2563eb',
      });
    },
  });

  const logout = () => {
    AuthService.logout();
    queryClient.clear();
    navigate('/login');
  };

  const isAuthenticated = AuthService.isAuthenticated();
  const user = AuthService.getUser();

  return {
    login: loginMutation.mutateAsync,
    register: registerMutation.mutate,
    logout,
    isAuthenticated,
    user,
    isLoading: loginMutation.isPending || registerMutation.isPending,
  };
};