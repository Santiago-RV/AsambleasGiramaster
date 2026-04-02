import toast from 'react-hot-toast';

export const useToast = () => ({
  success: (message, options = {}) => {
    return toast.success(message, {
      duration: 3000,
      ...options
    });
  },
  
  error: (message, options = {}) => {
    return toast.error(message, {
      duration: 5000,
      ...options
    });
  },
  
  loading: (message, options = {}) => {
    return toast.loading(message, {
      duration: 20000,
      ...options
    });
  },
  
  dismiss: (toastId) => {
    return toast.dismiss(toastId);
  },
  
  promise: (promise, messages = {}) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Cargando...',
      success: messages.success || 'Completado',
      error: messages.error || 'Error'
    });
  }
});

export default toast;