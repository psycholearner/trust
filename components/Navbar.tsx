
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, Fuel, ChevronDown, Layers, UserCircle, LogOut } from 'lucide-react';
import { useGlobalStore } from './GlobalStore';
import { NetworkType, UserRole } from '../types';
import { NETWORK_CONFIGS } from '../services/blockchain';

export const Navbar = () => {
  const { currentNetwork, setNetwork, userRole, connectAs, disconnect, walletAddress } = useGlobalStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = React.useState(false);
  const [showRoleMenu, setShowRoleMenu] = React.useState(false);
  const [gasPrice, setGasPrice] = React.useState(24);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'text-brand-600 font-bold' : 'text-slate-600 hover:text-brand-600 font-medium transition-colors';

  React.useEffect(() => {
    const interval = setInterval(() => {
      setGasPrice(prev => {
        const change = Math.floor(Math.random() * 5) - 2; 
        return Math.max(12, Math.min(50, prev + change));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const networks: { id: NetworkType; name: string; color: string }[] = [
    { id: 'SEPOLIA', name: 'Sepolia', color: 'bg-green-500' },
    { id: 'MAINNET', name: 'Ethereum', color: 'bg-blue-600' },
    { id: 'POLYGON', name: 'Polygon', color: 'bg-purple-600' },
    { id: 'BNB', name: 'BNB Chain', color: 'bg-yellow-500' },
    { id: 'AVALANCHE', name: 'Avalanche', color: 'bg-red-500' },
    { id: 'HYPERLEDGER', name: 'Hyperledger', color: 'bg-slate-700' }
  ];

  const simulationRoles: { id: UserRole; name: string; desc: string }[] = [
    { id: 'ADMIN', name: 'Admin', desc: 'Full System Access' },
    { id: 'ISSUER', name: 'Issuer', desc: 'Create Documents' },
    { id: 'VERIFIER', name: 'Verifier', desc: 'View Proofs' },
    { id: 'GUEST', name: 'Guest', desc: 'Read Only' }
  ];

  const handleConnect = (role: UserRole) => {
      connectAs(role);
      setShowRoleMenu(false);
  };

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/40 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <div className="absolute -inset-1 bg-brand-500 rounded-full opacity-0 group-hover:opacity-20 blur transition-opacity"></div>
                <ShieldCheck className="h-9 w-9 text-brand-600 relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">TrustChain AI</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className={isActive('/')}>Home</Link>
            <Link to="/verify" className={isActive('/verify')}>Verify</Link>
            <Link to="/history" className={isActive('/history')}>History</Link>
            
            {/* Creation only for Issuers/Admins */}
            {(userRole === 'ADMIN' || userRole === 'ISSUER') && (
                <Link to="/create" className={isActive('/create')}>Register</Link>
            )}

            {/* Dashboard accessible to Verifiers now (Read-Only View) */}
            {(userRole === 'ADMIN' || userRole === 'ISSUER' || userRole === 'VERIFIER') && (
                <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
            )}
            
            <div className="h-6 w-px bg-slate-300/50 mx-2"></div>

            {/* Network Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                className="flex items-center px-3 py-1.5 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm hover:bg-white transition-all text-xs font-semibold text-slate-700"
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${networks.find(n => n.id === currentNetwork)?.color || 'bg-slate-400'} animate-pulse`}></div>
                <span className="mr-1">{networks.find(n => n.id === currentNetwork)?.name}</span>
                <span className="text-slate-400 font-mono text-[10px] hidden lg:inline">
                   (ID: {NETWORK_CONFIGS[currentNetwork]?.chainId})
                </span>
                <ChevronDown className="w-3 h-3 ml-1.5 text-slate-400" />
              </button>

              {showNetworkMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50 animate-slideDown">
                   <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                      <Layers className="w-3 h-3 mr-1" /> Select Chain
                   </div>
                   {networks.map(net => (
                     <button
                        key={net.id}
                        onClick={() => { setNetwork(net.id); setShowNetworkMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-slate-50 flex items-center justify-between transition-colors group"
                     >
                       <div className="flex items-center">
                         <div className={`w-2 h-2 rounded-full mr-2 ${net.color}`}></div>
                         {net.name}
                       </div>
                       <span className="text-[9px] font-mono text-slate-300 group-hover:text-slate-500 bg-slate-50 group-hover:bg-slate-200 px-1 rounded">
                         ID: {NETWORK_CONFIGS[net.id].chainId}
                       </span>
                     </button>
                   ))}
                </div>
              )}
            </div>

            <div className="glass flex items-center space-x-1 text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-lg" title="Current Gas Price">
                <Fuel className="w-3.5 h-3.5 text-slate-400" />
                <span>{gasPrice}</span>
            </div>

            {/* Wallet / Role Selector */}
            <div className="relative">
               <button 
                 onClick={() => setShowRoleMenu(!showRoleMenu)}
                 className={`ml-2 px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 text-sm font-bold flex items-center active:scale-95 ${
                   userRole === 'GUEST' ? 'bg-brand-600 text-white hover:bg-brand-700' : 
                   'bg-slate-900 text-white hover:bg-slate-800'
                 }`}
               >
                 {userRole === 'GUEST' ? 'Connect Wallet' : (
                   <div className="flex items-center">
                     <span className={`w-2 h-2 rounded-full mr-2 ${userRole === 'ADMIN' ? 'bg-purple-400' : userRole === 'ISSUER' ? 'bg-blue-400' : 'bg-green-400'}`}></span>
                     {userRole}
                     <span className="ml-2 text-[10px] font-mono opacity-50 hidden xl:inline">
                         {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
                     </span>
                   </div>
                 )}
               </button>

               {showRoleMenu && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50 animate-slideDown">
                    <div className="px-4 py-2 border-b border-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Simulate Connection
                    </div>
                    {userRole !== 'GUEST' && (
                        <div className="px-4 py-2 bg-slate-50 mb-1">
                             <div className="text-xs font-bold text-slate-900">Current Session</div>
                             <div className="text-[10px] font-mono text-slate-500 break-all">{walletAddress}</div>
                             <button onClick={() => { disconnect(); setShowRoleMenu(false); }} className="mt-2 w-full flex items-center justify-center px-2 py-1 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100 font-bold transition-colors">
                                 <LogOut className="w-3 h-3 mr-1" /> Disconnect
                             </button>
                        </div>
                    )}
                    {simulationRoles.filter(r => r.id !== 'GUEST').map(role => (
                      <button
                          key={role.id}
                          onClick={() => handleConnect(role.id)}
                          disabled={userRole === role.id}
                          className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors hover:bg-slate-50 ${userRole === role.id ? 'opacity-50 cursor-not-allowed' : 'text-slate-700'}`}
                      >
                        <div className="flex items-center">
                            <UserCircle className={`w-4 h-4 mr-2 ${role.id === 'ADMIN' ? 'text-purple-600' : role.id === 'ISSUER' ? 'text-blue-600' : 'text-green-600'}`} />
                            <div>
                                <div className="font-bold">{role.name}</div>
                                <div className="text-[10px] text-slate-400">{role.desc}</div>
                            </div>
                        </div>
                        {userRole === role.id && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                      </button>
                    ))}
                  </div>
               )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600 hover:text-brand-600 transition-colors">
              {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-slate-200/50 px-4 pt-2 pb-6 space-y-2 absolute w-full animate-slideDown shadow-xl">
          <Link to="/" className="block py-3 px-2 text-slate-700 hover:bg-slate-50/50 rounded-lg font-medium">Home</Link>
          <Link to="/verify" className="block py-3 px-2 text-slate-700 hover:bg-slate-50/50 rounded-lg font-medium">Verify Document</Link>
          <Link to="/history" className="block py-3 px-2 text-slate-700 hover:bg-slate-50/50 rounded-lg font-medium">History</Link>
          {(userRole === 'ADMIN' || userRole === 'ISSUER') && (
            <Link to="/create" className="block py-3 px-2 text-slate-700 hover:bg-slate-50/50 rounded-lg font-medium">Create & Register</Link>
          )}
          {(userRole === 'ADMIN' || userRole === 'ISSUER' || userRole === 'VERIFIER') && (
            <Link to="/dashboard" className="block py-3 px-2 text-slate-700 hover:bg-slate-50/50 rounded-lg font-medium">Dashboard</Link>
          )}
          
          <div className="py-3 px-2 border-t border-slate-100 mt-2">
            <div className="text-xs font-semibold text-slate-500 mb-2">NETWORK</div>
            <div className="flex gap-2 flex-wrap">
              {networks.map(net => (
                <button key={net.id} onClick={() => setNetwork(net.id)} className={`px-2 py-1 rounded text-xs border ${currentNetwork === net.id ? 'bg-brand-50 border-brand-200 text-brand-700' : 'border-slate-200 text-slate-600'}`}>
                   {net.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500 mb-2">SIMULATE WALLET</div>
              <div className="grid grid-cols-2 gap-2">
                {simulationRoles.filter(r => r.id !== 'GUEST').map(role => (
                    <button 
                        key={role.id}
                        onClick={() => handleConnect(role.id)}
                        className={`py-2 rounded text-xs font-bold border ${userRole === role.id ? 'bg-slate-800 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                        {role.name}
                    </button>
                ))}
                {userRole !== 'GUEST' && (
                    <button onClick={disconnect} className="col-span-2 py-2 rounded text-xs font-bold border border-red-200 bg-red-50 text-red-600">
                        Disconnect Wallet
                    </button>
                )}
              </div>
          </div>
        </div>
      )}
    </nav>
  );
};
