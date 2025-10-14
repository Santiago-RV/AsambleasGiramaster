import React from "react";

const Header = ({ title }) => {
  return (
    <header className="bg-white shadow-md px-8 py-6 flex justify-between items-center">
      <h1 className="text-2xl font-semibold text-[#2c3e50]">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3498db] to-[#2980b9] flex items-center justify-center text-white font-bold">
          SA
        </div>
        <span className="text-gray-700 font-medium">Super Administrador</span>
      </div>
    </header>
  );
};

export default Header;
