import React from 'react';
import { useGlobalStore } from '../components/GlobalStore';
import { FileText, CheckCircle, ShieldAlert, Clock, Search, Hash, FileSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

export const VerificationHistory = () => {
  const { verificationHistory } = useGlobalStore();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Verification History</h1>
            <p className="mt-2 text-slate-600">Track and audit all your past document verification requests.</p>
          </div>
          <Link to="/verify" className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <FileSearch className="w-4 h-4 mr-2" />
            New Verification
          </Link>
        </div>

        {verificationHistory.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No verification history found</h3>
            <p className="text-slate-500 mt-2 mb-6">You haven't verified any documents yet.</p>
            <Link to="/verify" className="text-brand-600 font-medium hover:text-brand-700">
              Start your first verification &rarr;
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-900 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Document / Hash</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">AI Analysis</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {verificationHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-slate-100 rounded-lg mr-3">
                            {item.fileName.length > 20 && !item.fileName.includes('.') ? (
                                <Hash className="w-5 h-5 text-slate-500" />
                            ) : (
                                <FileText className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 truncate max-w-[200px]" title={item.fileName}>
                              {item.fileName}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[150px]">
                              {item.hash.substring(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'AUTHENTIC' 
                            ? 'bg-green-100 text-green-800' 
                            : item.status === 'TAMPERED' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-slate-100 text-slate-800'
                        }`}>
                          {item.status === 'AUTHENTIC' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 mr-1" />
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {item.timestamp}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-600 line-clamp-2 max-w-xs" title={item.details}>
                          {item.details || "No details available"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/verify#hash=${item.hash}`} 
                          className="text-brand-600 hover:text-brand-700 font-medium text-xs"
                        >
                          Re-verify
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
