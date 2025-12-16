import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info, X, AlertTriangle } from 'lucide-react';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning' | 'confirm';
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  onClose,
  onConfirm,
  confirmText = 'Confirm'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case 'confirm':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
      case 'confirm':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        <div className={`flex items-center justify-between p-4 border-b ${getHeaderColor()}`}>
          <div className="flex items-center space-x-2">
            {getIcon()}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 whitespace-pre-wrap">{message}</p>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          {type === 'confirm' && onConfirm ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
