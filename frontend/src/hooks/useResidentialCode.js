import { useState, useEffect } from 'react';

/**
 * Hook personalizado para generar un código único de unidad residencial
 * basado en el nombre, NIT y número de apartamentos
 * 
 * @param {string} name - Nombre de la unidad residencial
 * @param {string} nit - NIT de la unidad residencial
 * @param {number} apartments - Número de apartamentos
 * @returns {string} Código generado automáticamente
 */
export const useResidentialCode = (name, nit, apartments) => {
  const [code, setCode] = useState('');

  useEffect(() => {
    // Generar código solo si hay al menos un valor
    if (!name && !nit && !apartments) {
      setCode('');
      return;
    }

    // Obtener las primeras 3 letras del nombre (en mayúsculas)
    const namePrefix = name
      ? name
          .trim()
          .split(' ')
          .map(word => word.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 3)
          .padEnd(3, 'X')
      : 'XXX';

    // Obtener los últimos 4 dígitos del NIT
    const nitSuffix = nit
      ? nit.replace(/\D/g, '').slice(-4).padStart(4, '0')
      : '0000';

    // Formatear número de apartamentos (máximo 4 dígitos)
    const aptNumber = apartments
      ? String(apartments).padStart(4, '0').slice(0, 4)
      : '0000';

    // Formato: XXX-0000-0000
    const generatedCode = `${namePrefix}-${nitSuffix}-${aptNumber}`;
    
    setCode(generatedCode);
  }, [name, nit, apartments]);

  return code;
};

