import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu, RefreshCw } from 'lucide-react';

const DashboardLayout = ({
  title,
  subtitle,
  menuItems,
  activeTab,
  onTabChange,
  children,
  header,
  gradientFrom,
  gradientTo,
  accentColor,
  sidebarFooter,
  className = '',
}) => {
  {/* Bloquear deslisamiento verical con menu abierto */}
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    if (sidebarOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [sidebarOpen]);


  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Overlay mobile */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 bg-black/40 z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'
          }`}
      />

      {/* Sidebar */}
      <Sidebar
        title={title}
        subtitle={subtitle}
        menuItems={menuItems}
        activeTab={activeTab}
        onTabChange={(tab) => {
          onTabChange(tab);
          setSidebarOpen(false);
        }}
        gradientFrom={gradientFrom}
        gradientTo={gradientTo}
        accentColor={accentColor}
        footer={sidebarFooter}
        sidebarOpen={sidebarOpen} 
      />

      {/* Main */}
      <main
        className={`
          flex-1
          min-w-0
          ml-0 md:ml-[280px]
          flex flex-col
          overflow-auto
          ${className}
  `}
      >

        {/* Header */}
        <header
          className="
            bg-white
            shadow-sm
            border-b border-gray-200
            min-h-[56px]
            flex items-center
            px-4 md:px-6
            gap-3
            overflow-auto
            flex-nowrap
          "
        >
          {/* Botón menú mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden flex-shrink-0"
          >
            <Menu />
          </button>

          {/* Header content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {header}
          </div>

          {/* Botón refrescar */}
          <button
            onClick={() => window.location.reload()}
            title="Refrescar"
            className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </header>


        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>

      </main>
    </div>
  );
};

export default DashboardLayout;
