import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Wallet, Loader2, CheckCircle2, X, Copy, LogOut, Download, Shield, UploadCloud, Sparkles, Lock, Building2, ExternalLink, Fuel, TrendingDown, Zap, Clock } from 'lucide-react';
import { BlockchainService, NETWORK_CONFIGS } from '../services/blockchain';
import { PDFService } from '../services/pdfGenerator';
import { DocumentMetadata, GasStrategy } from '../types';
import { useNotification } from '../components/NotificationSystem';
import { useGlobalStore } from '../components/GlobalStore';

export const CreateDocument = () => {
  const { addNotification } = useNotification();
  const { addDocument, userRole, connectAs, currentNetwork } = useGlobalStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [registeredDoc, setRegisteredDoc] = useState<DocumentMetadata | null>(null);
  const [gasEstimate, setGasEstimate] = useState<{cost: string, usd: string} | null>(null);
  const [gasStrategy, setGasStrategy] = useState<GasStrategy>(GasStrategy.STANDARD);

  const [formData, setFormData] = useState({
    title: '',
    issuerName: '',
    type: 'Certificate',
    description: ''
  });

  // Drag counter to prevent flickering when entering/leaving child elements
  const dragCounter = useRef(0);

  // Attempt to auto-connect if wallet was previously connected
  useEffect(() => {
    const savedAddress = localStorage.getItem('trustchain_wallet');
    if (savedAddress) {
      setWalletAddress(savedAddress);
    }
  }, []);

  // Fetch gas estimate when network, step, or strategy changes
  useEffect(() => {
    const fetchGas = async () => {
        if (step === 2) {
            try {
                const estimate = await BlockchainService.estimateGas(currentNetwork, gasStrategy);
                setGasEstimate(estimate);
            } catch (e) {
                console.error("Gas estimation failed", e);
            }
        }
    };
    fetchGas();
  }, [step, currentNetwork, gasStrategy]);

  // Access Control Gate - Checks if role is allowed
  const isAuthorized = ['ISSUER', 'ADMIN'].includes(userRole);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center animate-slideUp">
          <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500"></div>
            
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Wallet className="w-10 h-10 text-brand-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Connect Authorized Wallet</h1>
            <p className="text-slate-600 mb-2">
              Document registration requires verified <span className="text-brand-600 font-bold">Issuer</span> or <span className="text-purple-600 font-bold">Admin</span> credentials.
            </p>
            <p className="text-sm text-slate-400 mb-10 italic">
               Currently viewed as <span className="font-semibold text-slate-700 uppercase">{userRole}</span>
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => connectAs('ISSUER')}
                className="group p-6 bg-white border-2 border-slate-100 rounded-2xl hover:border-brand-500 hover:bg-brand-50/30 transition-all text-left flex flex-col items-start gap-4 hover:-translate-y-1 shadow-sm hover:shadow-md"
              >
                <div className="p-3 bg-brand-50 rounded-xl group-hover:bg-brand-100 transition-colors">
                   <Building2 className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Issuer Portal</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Register new certificates, contracts, and verified digital assets.</p>
                </div>
              </button>

              <button 
                onClick={() => connectAs('ADMIN')}
                className="group p-6 bg-white border-2 border-slate-100 rounded-2xl hover:border-purple-500 hover:bg-purple-50/30 transition-all text-left flex flex-col items-start gap-4 hover:-translate-y-1 shadow-sm hover:shadow-md"
              >
                <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                   <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Admin Console</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Global network management, audit logs, and security oversight.</p>
                </div>
              </button>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium uppercase tracking-wider">
                  <Lock className="w-4 h-4" />
                  <span>Enterprise Security Enabled</span>
               </div>
               <button className="text-sm text-slate-500 hover:text-brand-600 font-semibold transition-colors flex items-center">
                 Apply for verification <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const connectWallet = async () => {
    try {
      // Pass the current userRole to ensure we get the correct simulated wallet
      const address = await BlockchainService.connectWallet(currentNetwork, userRole);
      setWalletAddress(address);
      localStorage.setItem('trustchain_wallet', address);
      addNotification('success', 'Wallet Connected Successfully', `Connected to ${currentNetwork}`);
    } catch (err) {
      addNotification('error', 'Failed to connect wallet');
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    if (selectedFile.size > 10 * 1024 * 1024) {
      addNotification('error', 'File is too large (Max 10MB)');
      return;
    }
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleAutoFill = () => {
    const titles = ['Supply Chain Manifest', 'University Diploma', 'Real Estate Deed', 'Employment Agreement'];
    const issuers = ['Logistics Global Inc.', 'Stanford University', 'City Land Registry', 'TechInnovate Corp'];
    const types = ['Certificate', 'Contract', 'Identity Proof', 'Transcripts'];

    const rand = Math.floor(Math.random() * titles.length);
    
    setFormData({
      title: titles[rand] + ` #${Math.floor(Math.random() * 1000)}`,
      issuerName: issuers[rand],
      type: types[rand],
      description: `Auto-generated sample document for demonstration purposes. Verified on ${new Date().toLocaleDateString()}.`
    });

    const content = "This is a sample document content generated for auto-fill testing. It simulates a valid digital asset.";
    const blob = new Blob([content], { type: 'application/pdf' });
    const dummyFile = new File([blob], `sample_${titles[rand].toLowerCase().replace(/\s/g, '_')}.pdf`, { type: 'application/pdf' });
    handleFileSelection(dummyFile);
    
    addNotification('info', 'Form Auto-Filled', 'Sample data and file loaded.');
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };
  
  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !file) return;

    setIsProcessing(true);
    setUploadProgress(0);

    // Dynamic animation speed based on block time
    // Fast chains (Avalanche) update very quickly, Mainnet updates slowly
    const blockTime = NETWORK_CONFIGS[currentNetwork].blockTimeMs;
    const updateInterval = blockTime / 20; // Break into ~20 steps

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, updateInterval);

    try {
      const hash = await BlockchainService.calculateHash(file);
      addNotification('info', 'File Hashed locally (SHA-256)', 'Security check passed');
      
      const ipfsCid = "QmMockCidForDemoPurposeOnly12345"; 

      // Pass current network and strategy to service
      const newDoc = await BlockchainService.registerDocument({
        title: formData.title,
        issuerName: formData.issuerName,
        type: formData.type,
        description: formData.description,
        hash,
        ipfsCid
      }, currentNetwork, gasStrategy);

      addDocument(newDoc);

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      await new Promise(resolve => setTimeout(resolve, 600));

      setRegisteredDoc(newDoc);
      setStep(3);
      addNotification('success', 'Document Registered!', `Transaction confirmed on ${currentNetwork}`);
    } catch (err) {
      clearInterval(progressInterval);
      console.error(err);
      addNotification('error', 'Registration failed', 'Please try again');
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const downloadReceipt = async () => {
    if (!registeredDoc) return;
    try {
      await PDFService.generateRegistrationReceipt(registeredDoc);
      addNotification('success', 'Receipt downloaded successfully');
    } catch (error) {
      console.error(error);
      addNotification('error', 'Failed to generate receipt PDF');
    }
  };

  const copyAddress = () => {
    if (walletAddress) {
        navigator.clipboard.writeText(walletAddress);
        addNotification('info', 'Address copied to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto animate-slideUp">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-4 border border-slate-200">
             <Building2 className="w-3 h-3 mr-2" />
             Enterprise Portal
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Register New Document</h1>
          <p className="mt-2 text-slate-600">Securely anchor your document to the <span className="font-bold text-brand-600">{currentNetwork}</span>.</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex justify-center items-center space-x-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex items-center ${s < 3 ? 'w-full' : ''}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                 step >= s ? 'bg-brand-600 text-white scale-110' : 'bg-slate-200 text-slate-500'
               }`}>
                 {s}
               </div>
               {s < 3 && <div className={`h-1 flex-1 mx-2 transition-all duration-500 ${step > s ? 'bg-brand-600' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden transition-all duration-300">
          {/* Step 1: Wallet Connection */}
          {step === 1 && (
            <div className="p-10 animate-fadeIn">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Wallet className="h-8 w-8 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Connect Enterprise Wallet</h2>
                <p className="text-slate-600 max-w-md mx-auto">
                  Connect your organization's verified wallet to sign transactions and pay gas fees on {currentNetwork}.
                </p>
              </div>

              {!walletAddress ? (
                <div className="flex justify-center">
                    <button 
                    onClick={connectWallet}
                    className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                    >
                    <div className="w-6 h-6 mr-3 bg-white rounded-full flex items-center justify-center p-0.5">
                       <Wallet className="w-4 h-4 text-brand-600" />
                    </div>
                    Connect MetaMask
                    </button>
                </div>
              ) : (
                <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-scaleIn">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-semibold text-slate-700">Connected</span>
                        </div>
                        <span className="text-xs font-mono font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded">{currentNetwork}</span>
                    </div>
                    
                    <div className="p-6">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Wallet Address</p>
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-lg font-bold text-slate-900 truncate">
                                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                                    </span>
                                    <button 
                                        onClick={copyAddress}
                                        className="text-slate-400 hover:text-brand-600 transition-colors p-1"
                                        title="Copy Address"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">Estimated Balance</p>
                                <p className="text-xl font-bold text-slate-900">1.842 {NETWORK_CONFIGS[currentNetwork].currency}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 mb-0.5">Role</p>
                                <p className="text-sm font-medium text-purple-600 flex items-center justify-end">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> {userRole}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => {
                                  setWalletAddress(null);
                                  localStorage.removeItem('trustchain_wallet');
                                  addNotification('info', 'Wallet Disconnected');
                                }} 
                                className="flex items-center justify-center py-2.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-medium transition-colors"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Disconnect
                            </button>
                            <button 
                                onClick={() => setStep(2)} 
                                className="flex items-center justify-center py-2.5 bg-brand-600 rounded-lg text-white hover:bg-brand-700 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                            >
                                Continue
                                <CheckCircle2 className="w-4 h-4 ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Form & Upload */}
          {step === 2 && (
            <div className="p-8 animate-fadeIn relative">
              <div className="absolute top-8 right-8 z-10">
                 <button 
                   type="button"
                   onClick={handleAutoFill}
                   className="flex items-center text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors"
                   title="Fill form with sample data"
                 >
                   <Sparkles className="w-3.5 h-3.5 mr-1" />
                   Auto-Fill
                 </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-2">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Document Title</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        placeholder="e.g. Degree Certificate"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                      <select 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                      >
                        <option>Certificate</option>
                        <option>Contract</option>
                        <option>Identity Proof</option>
                        <option>Transcripts</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Issuer Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      placeholder="Organization Name"
                      value={formData.issuerName}
                      onChange={e => setFormData({...formData, issuerName: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                    <textarea 
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      rows={3}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Document File</label>
                    
                    {!file ? (
                      <div 
                        onDragEnter={onDragEnter}
                        onDragLeave={onDragLeave}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ease-in-out cursor-pointer overflow-hidden ${
                          isDragging 
                            ? 'border-brand-500 bg-brand-50/50 scale-[1.01] shadow-lg ring-4 ring-brand-500/10' 
                            : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="file" 
                          id="file-upload" 
                          className="hidden" 
                          onChange={handleFileChange}
                          accept=".pdf,.png,.jpg,.jpeg"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center h-full w-full relative z-10 pointer-events-none">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
                            isDragging ? 'bg-brand-100 scale-125 animate-bounce' : 'bg-slate-100'
                          }`}>
                            <UploadCloud className={`h-8 w-8 transition-colors ${isDragging ? 'text-brand-600' : 'text-slate-400'}`} />
                          </div>
                          <h3 className={`text-lg font-semibold mb-1 transition-colors ${isDragging ? 'text-brand-700 scale-105' : 'text-slate-900'}`}>
                            {isDragging ? 'Release to Upload' : 'Click or drag file here'}
                          </h3>
                          <p className={`text-sm mb-4 transition-colors ${isDragging ? 'text-brand-600' : 'text-slate-500'}`}>
                              PDF, PNG, JPG (Max 10MB)
                          </p>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${isDragging ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                               <Shield className="w-3 h-3 mr-1.5" />
                               Secure Local Hashing
                          </div>
                        </label>
                        
                        {isDragging && (
                          <div className="absolute inset-0 bg-brand-50/50 backdrop-blur-[2px] flex items-center justify-center z-0 pointer-events-none">
                               <div className="absolute inset-0 bg-grid-brand-500/[0.1] [mask-image:linear-gradient(0deg,white,transparent)]"></div>
                               <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-100/50 to-transparent"></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-scaleIn group relative">
                          <div className="p-4 flex items-center space-x-4">
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                                  {previewUrl ? (
                                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                          <FileText className="w-8 h-8 text-slate-400" />
                                      </div>
                                  )}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-slate-900 truncate">{file.name}</h4>
                                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown Type'}</p>
                                  <div className="mt-1 flex items-center text-xs text-green-600 font-medium">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Ready for hashing
                                  </div>
                              </div>
                              {!isProcessing && (
                                  <button 
                                      onClick={clearFile}
                                      type="button"
                                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                      title="Remove file"
                                  >
                                      <X className="w-5 h-5" />
                                  </button>
                              )}
                          </div>
                          {isProcessing && (
                               <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                                   <div 
                                      className="h-full bg-brand-600 transition-all duration-300" 
                                      style={{ width: `${uploadProgress}%` }}
                                   ></div>
                               </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Gas Strategy Selector */}
                  <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-700">Transaction Priority & Fees</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                           type="button"
                           onClick={() => setGasStrategy(GasStrategy.ECONOMY)}
                           className={`p-3 rounded-xl border text-left transition-all ${
                               gasStrategy === GasStrategy.ECONOMY 
                               ? 'border-green-500 bg-green-50 ring-1 ring-green-500' 
                               : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                           }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold ${gasStrategy === GasStrategy.ECONOMY ? 'text-green-700' : 'text-slate-600'}`}>Economy</span>
                                <TrendingDown className={`w-3.5 h-3.5 ${gasStrategy === GasStrategy.ECONOMY ? 'text-green-600' : 'text-slate-400'}`} />
                            </div>
                            <div className="text-xs text-slate-500">Batched Tx</div>
                            <div className="text-[10px] text-green-600 font-semibold mt-1">Save ~35%</div>
                        </button>
                        
                        <button
                           type="button"
                           onClick={() => setGasStrategy(GasStrategy.STANDARD)}
                           className={`p-3 rounded-xl border text-left transition-all ${
                               gasStrategy === GasStrategy.STANDARD 
                               ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                               : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                           }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold ${gasStrategy === GasStrategy.STANDARD ? 'text-blue-700' : 'text-slate-600'}`}>Standard</span>
                                <Clock className={`w-3.5 h-3.5 ${gasStrategy === GasStrategy.STANDARD ? 'text-blue-600' : 'text-slate-400'}`} />
                            </div>
                            <div className="text-xs text-slate-500">Normal Speed</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-1">Avg 15s</div>
                        </button>

                        <button
                           type="button"
                           onClick={() => setGasStrategy(GasStrategy.URGENT)}
                           className={`p-3 rounded-xl border text-left transition-all ${
                               gasStrategy === GasStrategy.URGENT 
                               ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' 
                               : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                           }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold ${gasStrategy === GasStrategy.URGENT ? 'text-purple-700' : 'text-slate-600'}`}>Urgent</span>
                                <Zap className={`w-3.5 h-3.5 ${gasStrategy === GasStrategy.URGENT ? 'text-purple-600' : 'text-slate-400'}`} />
                            </div>
                            <div className="text-xs text-slate-500">Next Block</div>
                            <div className="text-[10px] text-purple-600 font-semibold mt-1">1.5x Fee</div>
                        </button>
                      </div>
                  </div>

                  {/* Gas Estimation Display */}
                  {gasEstimate && !isProcessing && file && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center animate-fadeIn">
                          <div className="flex items-center text-sm text-slate-700 font-medium">
                              <Fuel className="w-4 h-4 mr-2 text-slate-500" />
                              Estimated Network Fee
                          </div>
                          <div className="text-right">
                              <span className="block text-sm font-bold text-slate-900">{gasEstimate.cost}</span>
                              <span className="block text-xs text-slate-500">{gasEstimate.usd}</span>
                          </div>
                      </div>
                  )}

                  {isProcessing ? (
                    <div className="w-full bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
                      <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-900">Securing Document</h3>
                      <p className="text-xs text-slate-500 mt-1">Encrypting & Anchoring to {currentNetwork}...</p>
                      <p className="text-xs text-brand-600 font-mono mt-1">Routing to Chain ID: {NETWORK_CONFIGS[currentNetwork].chainId}</p>
                      {gasStrategy === GasStrategy.ECONOMY && (
                          <p className="text-xs text-green-600 font-semibold mt-2 flex items-center justify-center">
                              <TrendingDown className="w-3 h-3 mr-1" /> Optimizing Gas via Batch Proxy
                          </p>
                      )}
                    </div>
                  ) : (
                    <button 
                      type="submit"
                      disabled={!file}
                      className="w-full py-3 bg-brand-600 text-white rounded-lg font-bold text-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg hover:shadow-xl transform active:scale-[0.98]"
                    >
                      Register Document
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && registeredDoc && (
            <div className="p-10 text-center animate-scaleIn">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Registration Successful!</h2>
              <p className="text-slate-600 mb-8">
                Your document has been cryptographically secured on the <span className="font-bold">{currentNetwork}</span> blockchain.
              </p>

              <div className="bg-slate-50 p-6 rounded-xl text-left space-y-4 mb-8">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Document Hash</span>
                  <span className="font-mono text-sm text-slate-900">{registeredDoc.hash.slice(0, 20)}...</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Transaction ID</span>
                  <span className="font-mono text-sm text-brand-600 truncate max-w-[200px]" title={registeredDoc.txHash}>
                    {registeredDoc.txHash || '0x...'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">IPFS CID</span>
                  <div className="flex items-center">
                     <span className="font-mono text-xs text-slate-700 mr-2">{registeredDoc.ipfsCid.substring(0, 12)}...</span>
                     <ExternalLink className="w-3 h-3 text-slate-400 cursor-pointer hover:text-brand-600" onClick={() => window.open(`https://ipfs.io/ipfs/${registeredDoc.ipfsCid}`, '_blank')} />
                  </div>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Network</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {currentNetwork}
                  </span>
                </div>
                 <div className="flex justify-between">
                  <span className="text-slate-500">Gas Strategy</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      gasStrategy === GasStrategy.ECONOMY ? 'bg-green-100 text-green-800' :
                      gasStrategy === GasStrategy.URGENT ? 'bg-purple-100 text-purple-800' :
                      'bg-slate-100 text-slate-800'
                  }`}>
                    {gasStrategy}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={downloadReceipt}
                    className="inline-flex items-center justify-center px-6 py-3 border border-slate-200 shadow-sm text-base font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-0.5"
                  >
                    <Download className="w-5 h-5 mr-2 text-brand-600" />
                    Download Receipt (PDF)
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                  >
                    Register Another
                  </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};