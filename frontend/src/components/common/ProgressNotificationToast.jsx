import { useProgressNotification } from '../../contexts/ProgressNotificationContext';
import { CheckCircle, XCircle, Loader2, Mail, Send } from 'lucide-react';

const ProgressNotificationToast = () => {
  const { notifications } = useProgressNotification();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-[9999] flex flex-col gap-2">
      {notifications.map((notification) => {
        const isCompleted = notification.status === 'completed';
        const isFailed = notification.status === 'failed';
        const isProcessing = notification.status === 'processing';

        return (
          <div
            key={notification.id}
            className={`bg-white rounded-lg shadow-xl border-2 overflow-hidden min-w-[320px] max-w-[380px] animate-slide-in ${
              isCompleted ? 'border-green-500' : isFailed ? 'border-red-500' : 'border-blue-500'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {isProcessing && (
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                )}
                {isCompleted && (
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                )}
                {isFailed && (
                  <div className="bg-red-100 p-2 rounded-full">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">
                    {isCompleted ? 'Completado' : isFailed ? 'Error' : notification.title}
                  </p>
                  <p className="text-xs text-gray-500">{notification.message}</p>
                </div>
              </div>

              {isProcessing && (
                <>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">
                      {notification.current} / {notification.total}
                    </span>
                    <span className="text-blue-600 font-medium">{notification.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300 bg-blue-500"
                      style={{ width: `${notification.progress}%` }}
                    />
                  </div>
                </>
              )}

              {isCompleted && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Proceso finalizado exitosamente
                </p>
              )}

              {isFailed && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <XCircle size={12} />
                  {notification.message || 'El proceso falló'}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProgressNotificationToast;
