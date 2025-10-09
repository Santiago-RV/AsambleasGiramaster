import { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services/api/AuthService';

const AuthContext = createContext({
	user: null,
	isAuthenticated: false,
	isLoading: false,
	updateUser: () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const isAuth = AuthService.isAuthenticated();

				if (isAuth) {
					const userData = AuthService.getUser();
					if (userData) {
						setUser(userData);
					} else {
						setUser(null);
					}
				} else {
					setUser(null);
				}
			} catch (error) {
				console.error('Error al verificar autenticación:', error);
				setUser(null);
			} finally {
				setIsLoading(false);
			}
		};
		checkAuth();
	}, []);

	const updateUser = (userData) => {
		setUser(userData);

		if (userData) {
			localStorage.setItem('user', JSON.stringify(userData));
		} else {
			localStorage.removeItem('user');
		}
	};

	return (
		<AuthContext.Provider
			value={{ user, isAuthenticated: !!user, isLoading, updateUser }}
		>
			{children}
		</AuthContext.Provider>
	);
};
