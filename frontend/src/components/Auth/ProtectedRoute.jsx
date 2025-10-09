import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthService } from '../../services/api/AuthService';

export const ProtectedRoute = () => {
	const location = useLocation();
	const isAuthenticated = AuthService.isAuthenticated();

	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <Outlet />;
};
