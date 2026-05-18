
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LiveTicker } from './components/LiveTicker';
import { CustomCursor } from './components/CustomCursor';
import { InteractiveBackground } from './components/InteractiveBackground';
import { NotificationProvider } from './components/NotificationSystem';
import { GlobalProvider } from './components/GlobalStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { CreateDocument } from './pages/CreateDocument';
import { VerifyDocument } from './pages/VerifyDocument';
import { VerificationHistory } from './pages/VerificationHistory';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <Router>
      <NotificationProvider>
        <GlobalProvider>
          <div className="min-h-screen flex flex-col font-sans relative cursor-none-target">
            <InteractiveBackground />
            <CustomCursor />
            <Navbar />
            <main className="flex-grow pb-12 z-10 relative">
              <Routes>
                <Route path="/" element={<Landing />} />
                
                {/* 
                  RBAC RULE: Document Creation
                  The CreateDocument component handles its own Access Control UI to provide
                  a better onboarding experience (Connect Wallet prompt) for unauthorized users.
                */}
                <Route path="/create" element={<CreateDocument />} />
                
                {/* Public Access */}
                <Route path="/verify" element={<VerifyDocument />} />
                <Route path="/history" element={<VerificationHistory />} />
                
                {/* 
                  RBAC RULE: Audit Dashboard
                  - ADMIN: Full Access (Logs, Mempool, Fraud Stats)
                  - ISSUER: Organization Stats, My Docs
                  - VERIFIER: Read-Only Registry, Verification Stats (No Creation Details)
                  - GUEST: No Access
                */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'ISSUER', 'VERIFIER']}>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
            <LiveTicker />
          </div>
        </GlobalProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;
