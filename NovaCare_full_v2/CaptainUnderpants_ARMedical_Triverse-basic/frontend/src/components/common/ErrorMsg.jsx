// src/components/common/ErrorMsg.jsx
import { AlertTriangle } from 'lucide-react';

const ErrorMsg = ({ children, className = '' }) => {
  if (!children) return null;
  return (
    <div className={`flex items-start gap-2 p-3 bg-urgent/10 border-2 border-urgent rounded-lg ${className}`}>
      <AlertTriangle size={16} className="text-urgent flex-shrink-0 mt-0.5" />
      <p className="font-mono text-xs text-urgent">{children}</p>
    </div>
  );
};

export default ErrorMsg;
