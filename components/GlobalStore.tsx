import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNotification } from './NotificationSystem';
import { DocumentMetadata, NetworkType, UserRole, LiveVerification } from '../types';
import { BlockchainService, getRoleFromAddress } from '../services/blockchain';

const INITIAL_ACTIVITY_DATA = [
  { name: 'Mon', verify: 400, issue: 240 },
  { name: 'Tue', verify: 300, issue: 139 },
  { name: 'Wed', verify: 200, issue: 980 },
  { name: 'Thu', verify: 278, issue: 390 },
  { name: 'Fri', verify: 189, issue: 480 },
  { name: 'Sat', verify: 239, issue: 380 },
  { name: 'Sun', verify: 349, issue: 430 },
];

const MOCK_TITLES = ['University Degree', 'Property Deed', 'Supply Chain Manifest', 'Employment Contract', 'Medical Record', 'Purchase Order', 'Identity Card'];
const MOCK_ISSUERS = ['MIT', 'City Registry', 'Global Shipping Co', 'TechCorp Inc', 'General Hospital', 'Retail Giants', 'Gov ID Dept'];

const generateRandomDoc = () => ({
  id: `doc_${Math.floor(Math.random() * 100000)}`,
  title: `${MOCK_TITLES[Math.floor(Math.random() * MOCK_TITLES.length)]} - #${Math.floor(Math.random() * 999)}`,
  type: 'Certificate',
  issuer: MOCK_ISSUERS[Math.floor(Math.random() * MOCK_ISSUERS.length)],
  date: new Date().toLocaleTimeString(),
  status: 'PENDING' as const,
  ipfsCid: `Qm${Math.random().toString(36).substring(2, 15)}...`
});

// Fixed dates to be in the past to avoid "Creation date in future" errors during AI analysis
const INITIAL_DOCS: any[] = [
  {
    id: 'doc_12345',
    title: 'University Degree - John Doe',
    type: 'Certificate',
    issuer: 'MIT',
    date: '2023-10-24',
    status: 'ACTIVE',
    ipfsCid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
  },
  {
    id: 'doc_67890',
    title: 'Property Deed - 123 Maple St',
    type: 'Legal Contract',
    issuer: 'City Registry',
    date: '2023-10-23',
    status: 'ACTIVE',
    ipfsCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
  },
  {
    id: 'doc_54321',
    title: 'Supply Chain Manifest #99',
    type: 'Logistics',
    issuer: 'Global Shipping Co',
    date: '2023-10-22',
    status: 'SUSPICIOUS',
    ipfsCid: 'QmZ4tDuvesj134r56aLw7qaDkH89a7s6d5f4g3h2j1k'
  },
  {
    id: 'doc_98765',
    title: 'Employment Contract - Alice S.',
    type: 'Contract',
    issuer: 'TechCorp Inc',
    date: '2023-10-21',
    status: 'REVOKED',
    ipfsCid: 'QmP89A23d5F256bLw7qaDkH89a7s6d5f4g3h2j1k2345'
  }
];

export interface MempoolTx {
  id: string;
  hash: string;
  type: 'verify' | 'mint';
  color: string;
}

export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
}

interface GlobalState {
  isLive: boolean;
  setIsLive: (val: boolean) => void;
  simulationSpeed: 'SLOW' | 'NORMAL' | 'FAST';
  setSimulationSpeed: (val: 'SLOW' | 'NORMAL' | 'FAST') => void;
  currentNetwork: NetworkType;
  setNetwork: (net: NetworkType) => void;
  
  // Auth / RBAC
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  walletAddress: string | null;
  connectAs: (role: UserRole) => Promise<void>;
  disconnect: () => void;
  
  recentDocs: any[];
  activityData: any[];
  stats: {
    total: number;
    verify24h: number;
    fraud: number;
    issuers: number;
  };
  mempool: MempoolTx[];
  blockHeight: number;
  logs: {time: string, msg: string, type: 'info' | 'success' | 'warning' | 'error'}[];
  latestAlert: SystemAlert | null;
  recentAlerts: SystemAlert[];
  dismissAlert: () => void;
  removeRecentAlert: (id: string) => void;
  addDocument: (doc: DocumentMetadata) => void;
  addVerification: (isValid: boolean) => void;
  liveVerifications: LiveVerification[];
  verificationHistory: VerificationHistoryItem[];
  addToHistory: (item: VerificationHistoryItem) => void;
}

export interface VerificationHistoryItem {
  id: string;
  fileName: string;
  hash: string;
  status: 'AUTHENTIC' | 'TAMPERED' | 'UNKNOWN';
  timestamp: string;
  details?: string;
}

const GlobalContext = createContext<GlobalState | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = useNotification();
  const [isLive, setIsLive] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
  
  // PRODUCTION: Default to POLYGON for cost efficiency
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('POLYGON');
  
  // Auth State
  const [userRole, setUserRole] = useState<UserRole>('GUEST');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const [recentDocs, setRecentDocs] = useState<any[]>(INITIAL_DOCS);
  const [activityData, setActivityData] = useState(INITIAL_ACTIVITY_DATA);
  const [mempool, setMempool] = useState<MempoolTx[]>([]);
  const [blockHeight, setBlockHeight] = useState(1849201);
  const [stats, setStats] = useState({
    total: 12450,
    verify24h: 842,
    fraud: 128,
    issuers: 45
  });
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'success' | 'warning' | 'error'}[]>([]);
  const [latestAlert, setLatestAlert] = useState<SystemAlert | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<SystemAlert[]>([]);
  const [liveVerifications, setLiveVerifications] = useState<LiveVerification[]>([]);
  const [verificationHistory, setVerificationHistory] = useState<VerificationHistoryItem[]>([]);

  const addToHistory = useCallback((item: VerificationHistoryItem) => {
    setVerificationHistory(prev => [item, ...prev]);
  }, []);

  const dismissAlert = useCallback(() => setLatestAlert(null), []);
  const removeRecentAlert = useCallback((id: string) => {
    setRecentAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const connectAs = useCallback(async (roleRequest: UserRole) => {
    try {
      // 1. Connect wallet (Mock)
      const address = await BlockchainService.connectWallet(currentNetwork, roleRequest);
      setWalletAddress(address);
      localStorage.setItem('trustchain_wallet', address);

      // 2. Validate Role via "Smart Contract" Registry
      const derivedRole = getRoleFromAddress(address);
      setUserRole(derivedRole);

      // 3. Log
      setLogs(prev => [...prev.slice(-19), {
        time: new Date().toLocaleTimeString(),
        msg: `Auth: Wallet connected with role ${derivedRole}`,
        type: 'success'
      }]);
      addNotification('success', `Connected as ${derivedRole}`, `Address: ${address.slice(0, 8)}...`);

    } catch (e) {
      console.error(e);
      addNotification('error', 'Connection failed');
    }
  }, [currentNetwork, addNotification]);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setUserRole('GUEST');
    localStorage.removeItem('trustchain_wallet');
    addNotification('info', 'Wallet Disconnected');
  }, [addNotification]);

  const setNetwork = useCallback((net: NetworkType) => {
    setCurrentNetwork(net);
    addNotification('info', `Network Switched to ${net}`, 'System reconnecting...');
    setLogs(prev => [...prev.slice(-19), {
      time: new Date().toLocaleTimeString(),
      msg: `Network switch: Active chain is now ${net}`,
      type: 'warning'
    }]);
  }, [addNotification]);

  const addDocument = useCallback((doc: DocumentMetadata) => {
    const newDoc = {
      id: doc.id,
      title: doc.title,
      type: doc.type,
      issuer: doc.issuerName,
      date: new Date().toLocaleTimeString(),
      status: 'PENDING',
      ipfsCid: doc.ipfsCid
    };
    setRecentDocs(prev => [newDoc, ...prev.slice(0, 9)]);
    setStats(prev => ({ ...prev, total: prev.total + 1 }));
    setLogs(prev => [...prev.slice(-19), {
      time: new Date().toLocaleTimeString(),
      msg: `New User Registration: ${doc.title}`,
      type: 'info'
    }]);
    
    setMempool(prev => [...prev, {
      id: Math.random().toString(36),
      hash: doc.hash.substring(0, 10),
      type: 'mint',
      color: 'bg-blue-500'
    }]);

    const alert: SystemAlert = {
        id: Math.random().toString(),
        title: 'Transaction Submitted',
        message: `Registering on ${currentNetwork}...`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
    };
    setLatestAlert(alert);
    setRecentAlerts(prev => [alert, ...prev].slice(0, 9));
    setTimeout(() => setLatestAlert(null), 5000);

  }, [currentNetwork]);

  const addVerification = useCallback((isValid: boolean) => {
    setStats(prev => ({ 
      ...prev, 
      verify24h: prev.verify24h + 1,
      fraud: !isValid ? prev.fraud + 1 : prev.fraud
    }));
    
    setLogs(prev => [...prev.slice(-19), {
      time: new Date().toLocaleTimeString(),
      msg: `Verification: ${isValid ? 'Success' : 'Fraud Detected'}`,
      type: isValid ? 'success' : 'error'
    }]);

    setMempool(prev => [...prev, {
      id: Math.random().toString(36),
      hash: '0x' + Math.random().toString(16).substr(2, 8),
      type: 'verify',
      color: isValid ? 'bg-green-400' : 'bg-red-400'
    }]);
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const intervalTime = simulationSpeed === 'FAST' ? 300 : simulationSpeed === 'SLOW' ? 2000 : 800;

    const interval = setInterval(() => {
      const rand = Math.random();

      // Mempool Simulation
      if (rand > 0.3) {
        const newTx: MempoolTx = {
          id: Math.random().toString(36),
          hash: '0x' + Math.random().toString(16).substr(2, 8),
          type: rand > 0.6 ? 'mint' : 'verify',
          color: rand > 0.6 ? 'bg-blue-400' : 'bg-green-400'
        };
        setMempool(prev => [...prev, newTx]);
      }

      if (mempool.length > 8) {
         setMempool([]); 
         setBlockHeight(prev => prev + 1);
         setLogs(prev => [...prev.slice(-19), {
            time: new Date().toLocaleTimeString(),
            msg: `Block #${blockHeight + 1} mined on ${currentNetwork}`,
            type: 'success'
          }]);
      }

      // New Document Registration Simulation
      if (rand < 0.2) {
        const newDoc = generateRandomDoc();
        setRecentDocs(prev => [newDoc, ...prev.slice(0, 9)]);
        setStats(prev => ({ ...prev, total: prev.total + 1 }));
      }

      // Status Update Simulation (Pending -> Active/Revoked)
      setRecentDocs(prev => prev.map(doc => {
        if (doc.status === 'PENDING') {
            if (Math.random() > 0.3) {
                const randOutcome = Math.random();
                const isSuccess = randOutcome > 0.15;
                const newStatus = isSuccess ? 'ACTIVE' : (randOutcome > 0.05 ? 'SUSPICIOUS' : 'REVOKED');
                
                // Log the outcome
                setLogs(prevLogs => [...prevLogs.slice(-19), {
                  time: new Date().toLocaleTimeString(),
                  msg: `System: Verification ${isSuccess ? 'Passed' : 'Failed'} for ${doc.id} - Consensus: ${isSuccess ? 'Finalized' : 'Rejected'}`,
                  type: isSuccess ? 'success' : 'error'
                }]);

                // If it fails, trigger an alert
                if (!isSuccess) {
                    const alert: SystemAlert = {
                        id: Math.random().toString(),
                        title: 'Consensus Failure',
                        message: `Forgery detected or consensus failed for ${doc.title}`,
                        type: 'error',
                        timestamp: new Date().toLocaleTimeString()
                    };
                    setLatestAlert(alert);
                    setRecentAlerts(prevAlerts => [alert, ...prevAlerts].slice(0, 9));
                    setTimeout(() => setLatestAlert(null), 5000);
                } else {
                    // Success alert
                    const alert: SystemAlert = {
                        id: Math.random().toString(),
                        title: 'Document Finalized',
                        message: `${doc.title} has been successfully verified and anchored.`,
                        type: 'success',
                        timestamp: new Date().toLocaleTimeString()
                    };
                    setLatestAlert(alert);
                    setRecentAlerts(prevAlerts => [alert, ...prevAlerts].slice(0, 9));
                    setTimeout(() => setLatestAlert(null), 3000);
                }
                
                return { ...doc, status: newStatus };
            }
        }
        return doc;
      }));
      
      // Live Verification Feed Simulation
      if (rand > 0.6) {
         const isVerified = Math.random() > 0.15;
         const newVer: LiveVerification = {
             id: Math.random().toString(36).substr(2, 9),
             docId: `doc_${Math.floor(Math.random() * 9000) + 1000}`,
             status: isVerified ? 'VERIFIED' : 'FAILED',
             timestamp: new Date().toLocaleTimeString(),
             location: ['New York, US', 'Berlin, DE', 'Tokyo, JP', 'London, UK', 'Singapore', 'Toronto, CA', 'Paris, FR'][Math.floor(Math.random() * 7)]
         };
         setLiveVerifications(prev => [newVer, ...prev].slice(0, 7));
         
         // Update aggregate stats
         setStats(prev => ({ 
           ...prev, 
           verify24h: prev.verify24h + 1,
           fraud: !isVerified ? prev.fraud + 1 : prev.fraud
         }));
         
         // Visual stats update for graph
         setActivityData(prev => {
            const newData = [...prev];
            const lastIndex = newData.length - 1;
            newData[lastIndex] = { 
              ...newData[lastIndex], 
              verify: newData[lastIndex].verify + 1 
            };
            return newData;
         });
      }

      // Alerts
      if (rand < 0.02) {
        const alertTypes: SystemAlert[] = [
          {
            id: Math.random().toString(),
            title: 'Suspicious Activity',
            message: 'Multiple failed verification attempts detected from IP 192.168.x.x',
            type: 'warning',
            timestamp: new Date().toLocaleTimeString()
          },
          {
            id: Math.random().toString(),
            title: 'Latency Spike',
            message: 'Network latency increased to 450ms. Syncing nodes...',
            type: 'info',
            timestamp: new Date().toLocaleTimeString()
          },
          {
            id: Math.random().toString(),
            title: 'Protocol Upgrade',
            message: 'New consensus rules being propagated to layer-2 nodes.',
            type: 'success',
            timestamp: new Date().toLocaleTimeString()
          },
          {
            id: Math.random().toString(),
            title: 'Node Offline',
            message: 'Validator node #12 disconnected unexpectedly.',
            type: 'error',
            timestamp: new Date().toLocaleTimeString()
          }
        ];
        
        const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        setLatestAlert(alert);
        setRecentAlerts(prev => [alert, ...prev].slice(0, 9));
        setTimeout(() => setLatestAlert(null), 6000);
      }

    }, intervalTime);

    return () => clearInterval(interval);
  }, [isLive, simulationSpeed, mempool.length, blockHeight, currentNetwork]);

  return (
    <GlobalContext.Provider value={{
      isLive, setIsLive,
      simulationSpeed, setSimulationSpeed,
      currentNetwork, setNetwork,
      userRole, setUserRole,
      walletAddress, connectAs, disconnect,
      recentDocs,
      activityData,
      stats,
      mempool,
      blockHeight,
      logs,
      latestAlert,
      recentAlerts,
      dismissAlert,
      removeRecentAlert,
      addDocument,
      addVerification,
      liveVerifications,
      verificationHistory,
      addToHistory
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalStore = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalStore must be used within a GlobalProvider');
  }
  return context;
};