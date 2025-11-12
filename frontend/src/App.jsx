import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './providers/AppProvider';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { RoleBasedRoute } from './components/Auth/RoleBasedRoute';
import React from 'react';
import Login from './pages/Login';
import HomeSA from './pages/HomeSA';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
	return (
		<AppProvider>
			<Routes>
				{/* Ruta pública - Login */}
				<Route path="/login" element={<Login />} />

				{/* Rutas protegidas por autenticación */}
				<Route path="/" element={<ProtectedRoute />}>
					{/* Ruta principal - Redirige según el rol */}
					<Route
						index
						element={
							<RoleBasedRoute
								allowedRoles={['Super Administrador']}
							>
								<HomeSA />
							</RoleBasedRoute>
						}
					/>
				</Route>

				{/* Ruta 404 - Página no encontrada */}
				<Route path="*" element={<NotFound />} />
			</Routes>
		</AppProvider>
	);
}

export default App;
