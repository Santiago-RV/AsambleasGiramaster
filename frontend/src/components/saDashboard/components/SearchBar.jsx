import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ searchTerm, onSearchChange }) => {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
			<div className="relative">
				<Search
					className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
					size={20}
				/>
				<input
					type="text"
					placeholder="Buscar residentes por nombre, usuario, email o apartamento..."
					value={searchTerm}
					onChange={(e) => onSearchChange(e.target.value)}
					className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
				/>
			</div>
		</div>
	);
};

export default SearchBar;