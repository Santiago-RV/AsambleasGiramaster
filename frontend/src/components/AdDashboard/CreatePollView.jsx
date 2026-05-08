import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Play, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function CreatePollView({ meeting, onBack, onPollCreated }) {
  const [formData, setFormData] = useState({
    str_title: '',
    str_description: '',
    str_poll_type: 'single',
    bln_is_anonymous: false,
    bln_requires_quorum: false,
    dec_minimum_quorum_percentage: 50,
    bln_allows_abstention: true,
    int_max_selections: 1,
    int_duration_minutes: null,
  });

  const [options, setOptions] = useState([
    { str_option_text: '', int_option_order: 1 },
    { str_option_text: '', int_option_order: 2 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].str_option_text = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([
      ...options,
      { str_option_text: '', int_option_order: options.length + 1 },
    ]);
  };

  const removeOption = (index) => {
    if (options.length <= 2 && ['single', 'multiple'].includes(formData.str_poll_type)) {
      Swal.fire({
        icon: 'warning',
        title: 'Advertencia',
        text: 'Debes tener al menos 2 opciones para encuestas de selección',
      });
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!formData.str_title.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El título es obligatorio',
      });
      return false;
    }

    if (['single', 'multiple'].includes(formData.str_poll_type)) {
      const validOptions = options.filter((opt) => opt.str_option_text.trim());
      if (validOptions.length < 2) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Debes tener al menos 2 opciones válidas',
        });
        return false;
      }
    }

    if (formData.bln_requires_quorum) {
      const quorumValue = parseFloat(formData.dec_minimum_quorum_percentage);
      if (isNaN(quorumValue) || quorumValue < 1 || quorumValue > 100) {
        Swal.fire({
          icon: 'error',
          title: 'Error en Quórum',
          text: 'El porcentaje de quórum debe ser mayor a 0 y menor o igual a 100',
        });
        return false;
      }
    } else {
      formData.dec_minimum_quorum_percentage = 0;
    }

    return true;
  };

  const handleSubmit = async (startImmediately = false) => {
    console.log('📝 [CreatePollView] handleSubmit llamado:', { startImmediately, isSubmitting });

    // Evitar múltiples envíos simultáneos
    if (isSubmitting) {
      console.warn('⚠️ [CreatePollView] Ya hay una encuesta en proceso de creación');
      return;
    }

    if (!validateForm()) {
      console.warn('⚠️ [CreatePollView] Validación fallida');
      return;
    }

    const pollData = {
      int_meeting_id: meeting.id,
      ...formData,
      dec_minimum_quorum_percentage: parseFloat(formData.dec_minimum_quorum_percentage) || 0,
      int_max_selections: parseInt(formData.int_max_selections) || 1,
      int_duration_minutes: formData.int_duration_minutes ? parseInt(formData.int_duration_minutes) : null,
      options: ['single', 'multiple'].includes(formData.str_poll_type)
        ? options
            .filter((opt) => opt.str_option_text.trim())
            .map((opt, index) => ({
              str_option_text: opt.str_option_text.trim(),
              int_option_order: index + 1,
            }))
        : [],
    };

    console.log('📊 [CreatePollView] Datos de la encuesta preparados:', {
      pollData,
      startImmediately,
      onPollCreatedExists: !!onPollCreated
    });

    if (onPollCreated) {
      try {
        setIsSubmitting(true);
        console.log('🚀 [CreatePollView] Llamando a onPollCreated...');
        await onPollCreated(pollData, startImmediately);
        console.log('✅ [CreatePollView] onPollCreated completado exitosamente');
      } catch (error) {
        console.error('❌ [CreatePollView] Error en onPollCreated:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      console.error('❌ [CreatePollView] onPollCreated no está definido');
    }
  };

  const requiresOptions = ['single', 'multiple'].includes(formData.str_poll_type);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header fijo */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-3 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Volver a reuniones</span>
        </button>
        <h2 className="text-xl font-bold text-gray-800">Crear Encuesta</h2>
        <p className="text-gray-600 text-sm mt-0.5">Reunión: {meeting.str_title}</p>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
<div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Título de la Encuesta *
              </label>
              <input
                type="text"
                name="str_title"
                value={formData.str_title}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ej: ¿Aprueba usted el presupuesto 2024?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                name="str_description"
                value={formData.str_description}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Descripción adicional de la encuesta (opcional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Encuesta *
                </label>
                <select
                  name="str_poll_type"
                  value={formData.str_poll_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="single">Selección Única</option>
                  <option value="multiple">Selección Múltiple</option>
                  <option value="text">Texto Libre</option>
                  <option value="numeric">Numérica</option>
                </select>
              </div>

              {formData.str_poll_type === 'multiple' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Máximo de Selecciones
                  </label>
                  <input
                    type="number"
                    name="int_max_selections"
                    value={formData.int_max_selections}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  name="int_duration_minutes"
                  value={formData.int_duration_minutes || ''}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Dejar vacío para sin límite"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="bln_is_anonymous"
                  id="bln_is_anonymous"
                  checked={formData.bln_is_anonymous}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <label htmlFor="bln_is_anonymous" className="ml-2 text-sm text-gray-700">
                  Encuesta Anónima
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="bln_allows_abstention"
                  id="bln_allows_abstention"
                  checked={formData.bln_allows_abstention}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <label htmlFor="bln_allows_abstention" className="ml-2 text-sm text-gray-700">
                  Permitir Abstención
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="bln_requires_quorum"
                  id="bln_requires_quorum"
                  checked={formData.bln_requires_quorum}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <label htmlFor="bln_requires_quorum" className="ml-2 text-sm text-gray-700">
                  Requiere Quórum
                </label>
              </div>

              {formData.bln_requires_quorum && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quórum Mínimo (%)
                  </label>
                  <input
                    type="number"
                    name="dec_minimum_quorum_percentage"
                    value={formData.dec_minimum_quorum_percentage}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {requiresOptions && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Opciones de Respuesta *
                  </label>
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Plus size={16} />
                    Agregar Opción
                  </button>
                </div>

                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <span className="text-gray-500 font-medium min-w-[30px]">
                        {index + 1}.
                      </span>
                      <input
                        type="text"
                        value={option.str_option_text}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder={`Opción ${index + 1}`}
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
        </div>
      </div>

      {/* Botones fijos al fondo */}
      <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', gap: '16px' }}>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#4b5563',
              color: '#fff',
              fontWeight: 600,
              fontSize: '15px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={20} />
                Guardar como Borrador
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'linear-gradient(to right, #16a34a, #15803d)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '15px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Play size={20} />
                Crear e Iniciar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
