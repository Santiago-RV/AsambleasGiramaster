import { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services/api/AuthService';

const AuthContext = createContext({
	user: null,
	isAuthenticated: false,
	isLoading: false,
	updateUser: () => { },
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {

	const [user, setUser] = useState(() => {
		try {
			const raw = localStorage.getItem('user');
			const token = localStorage.getItem('access_token');
			if (raw && token && AuthService.isAuthenticated()) return JSON.parse(raw);
			return null;
		} catch {
			return null;
		}
	});

	// Escuchar cuando otra parte de la app escribe en localStorage
	// Esto cubre el caso del auto-login que escribe DESPUÉS de navegar
	useEffect(() => {
		const handleStorageChange = () => {
			try {
				const raw = localStorage.getItem('user');
				const token = localStorage.getItem('access_token');
				if (raw && token) {
					setUser(JSON.parse(raw));
				} else {
					setUser(null);
				}
			} catch {
				setUser(null);
			}
		};

		// Escuchar cambios en localStorage desde otras pestañas
		window.addEventListener('storage', handleStorageChange);

		// También revisar inmediatamente por si el auto-login ya escribió
		// antes de que este useEffect corriera
		handleStorageChange();

		return () => window.removeEventListener('storage', handleStorageChange);
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
			value={{ user, isAuthenticated: AuthService.isAuthenticated(), isLoading: false, updateUser }}
		>
			{children}
		</AuthContext.Provider>
	);
};