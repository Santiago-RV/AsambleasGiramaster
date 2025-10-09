import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../services/api/AuthService";
import { useAuthContext } from "../providers/AuthProvider";

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

      if (!data.data.username || !data.data.role) {
        throw new Error('Datos de usuario incompletos');
      }

      const userData = {
        username: data.data.username,
        role: data.data.role,
      }
      updateUser(userData);

      // Limpiar el cache de la query
      queryClient.clear();

      navigate('/');
    },
    onError: (error) => {
      console.error('Error al iniciar sesión:', error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data) => AuthService.register(data),
    onSuccess: () => {
      toast.success('Registro exitoso');
      navigate('/login');
    },
    onError: (error) => {
      console.error('Error al registrar:', error);
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