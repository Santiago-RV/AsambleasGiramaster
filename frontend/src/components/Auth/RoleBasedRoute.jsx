import { Navigate, useLocation } from 'react-router-dom';
import { AuthService } from '../../services/api/AuthService';

export const RoleBasedRoute = ({ children, allowedRoles = [] }) => {
	const location = useLocation();
	const user = AuthService.getUser();
	const isAuthenticated = AuthService.isAuthenticated();

	// Si no está autenticado, redirigir al login
	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// Si no hay usuario en localStorage, redirigir al login
	if (!user) {
		// Limpiar el token si no hay usuario
		AuthService.logout();
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// Si hay roles permitidos y el usuario no tiene el rol adecuado
	if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
		// Redirigir al login si no tiene el rol adecuado
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// Si todo está bien, renderizar el componente hijo
	return children;
};
