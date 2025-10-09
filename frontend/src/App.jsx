import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './providers/AppProvider';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import React from 'react';
import Login from './pages/Login';
import './App.css';

function App() {
	return (
		<AppProvider>
			<Routes>
				<Route path="/" element={<ProtectedRoute />}>
					{/* <Route path="/" element={<Home />} /> */}
				</Route>
				<Route path="/login" element={<Login />} />
			</Routes>
		</AppProvider>
	);
}

export default App;
