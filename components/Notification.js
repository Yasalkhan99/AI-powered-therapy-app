import React from 'react';

const Notification = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      default:
        return 'bg-blue-100 border-blue-500 text-blue-700';
    }
  };

  return (
    <div className={`p-4 border-l-4 rounded-md ${getTypeStyles()}`}>
      <div className="flex justify-between items-center">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm font-medium">{message}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-lg font-bold hover:opacity-75"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Notification;