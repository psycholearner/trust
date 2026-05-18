import React from 'react';
import { Navigate } from 'react-router-dom';
import { useGlobalStore } from './GlobalStore';
import { UserRole } from '../types';
import { ShieldAlert, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { userRole } = useGlobalStore();

  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center animate-scaleIn">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">
            Your current role (<span className="font-bold text-red-600">{userRole}</span>) does not have permission to view this resource.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg text-left text-sm mb-6 border border-slate-200">
             <p className="font-semibold text-slate-700 mb-2">Required Roles:</p>
             <div className="flex flex-wrap gap-2">
                {allowedRoles.map(role => (
                    <span key={role} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold">
                        {role}
                    </span>
                ))}
             </div>
          </div>
          <a href="/" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
