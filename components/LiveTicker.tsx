import React, { useState, useEffect } from 'react';
import { Activity, Globe, Zap, Box } from 'lucide-react';

const MESSAGES = [
  { text: "Block #1849201 mined by 0x3a...9f (124 txs)", type: "block" },
  { text: "Large verification request: 45 documents from EduCorp", type: "tx" },
  { text: "Network Difficulty: 14.5T - Hashrate stable", type: "net" },
  { text: "New validator node joined: Tokyo, JP", type: "node" },
  { text: "Smart Contract Audit completed for RegistryV3", type: "info" },
  { text: "Suspicious pattern detected in pool 0x4...b2 - Auto-flagged", type: "alert" },
  { text: "Oracle updated: ETH/USD $2,845.20", type: "oracle" },
  { text: "Cross-chain bridge active: Polygon <-> Sepolia", type: "bridge" }
];

export const LiveTicker = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % MESSAGES.length);
        setVisible(true);
      }, 500); // Wait for fade out
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const current = MESSAGES[index];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-slate-300 text-xs py-2 px-4 z-40 flex items-center justify-between shadow-2xl">
      <div className="flex items-center space-x-4 overflow-hidden">
        <div className="flex items-center text-brand-400 font-bold uppercase tracking-wider whitespace-nowrap">
          <Activity className="w-3 h-3 mr-2 animate-pulse" />
          Live Feed
        </div>
        <div className={`transition-opacity duration-500 font-mono whitespace-nowrap overflow-hidden text-ellipsis ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <span className="mr-2 text-slate-600 hidden sm:inline">[{new Date().toLocaleTimeString()}]</span>
          {current.type === 'alert' && <span className="text-red-400 font-bold mr-2">ALERT:</span>}
          {current.type === 'block' && <Box className="inline w-3 h-3 mr-1 text-blue-400" />}
          {current.text}
        </div>
      </div>
      <div className="hidden md:flex items-center space-x-6 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
         <div className="flex items-center">
            <Globe className="w-3 h-3 mr-1.5" />
            <span>Peers: 142</span>
         </div>
         <div className="flex items-center">
            <Zap className="w-3 h-3 mr-1.5" />
            <span>TPS: 14.2</span>
         </div>
         <div className="flex items-center text-green-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
            Online
         </div>
      </div>
    </div>
  );
};