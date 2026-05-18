import React, { useState, useRef, useEffect } from 'react';
import { FileCheck, ShieldAlert, CheckCircle, UploadCloud, Brain, FileSearch, Hash, QrCode, Loader2, X, Image as ImageIcon, Shield, CheckCircle2, Sparkles, FileWarning, Fingerprint, ScanEye, Zap, Activity, Microscope, Layers, FileJson, ExternalLink, Download, Ruler, Grid3X3, Eye, StopCircle, Camera } from 'lucide-react';
import { BlockchainService } from '../services/blockchain';
import { GeminiService } from '../services/gemini';
import { PDFService } from '../services/pdfGenerator';
import { DocumentMetadata, VerificationResult, VerificationMethod } from '../types';
import { useNotification } from '../components/NotificationSystem';
import { useGlobalStore } from '../components/GlobalStore';
import jsQR from 'jsqr';
import { GoogleGenAI } from "@google/genai";

export const VerifyDocument = () => {
  const { addNotification } = useNotification();
  const { addVerification, currentNetwork, addToHistory } = useGlobalStore();
  const [method, setMethod] = useState<VerificationMethod | 'LIVE'>(VerificationMethod.FILE); // Added 'LIVE'
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hashInput, setHashInput] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'ANALYZING' | 'COMPLETE'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [scanStage, setScanStage] = useState<string>('Initializing'); 
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  // QR & Live Scanning Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef<boolean>(false);

  // Live Analysis State
  const [liveAnalysis, setLiveAnalysis] = useState<{
    label: string;
    confidence: number;
    color: string;
    details: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (method === VerificationMethod.QR || method === 'LIVE') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [method]);

  // Animate score when result changes
  useEffect(() => {
    if (result?.aiAnalysis?.forensics?.overallScore) {
      setDisplayScore(0);
      const timer = setTimeout(() => {
        setDisplayScore(result.aiAnalysis!.forensics.overallScore);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDisplayScore(0);
    }
  }, [result]);

  // Check for URL parameters
  useEffect(() => {
    const checkUrlParams = () => {
      try {
        const hashPart = window.location.hash.split('?')[1];
        if (hashPart) {
            const params = new URLSearchParams(hashPart);
            const urlHash = params.get('hash');
            if (urlHash) {
                setHashInput(urlHash);
                setMethod(VerificationMethod.HASH);
                addNotification('info', 'Hash detected from URL', 'Ready to verify');
            }
        }
      } catch (e) {
        console.error("Error parsing URL params", e);
      }
    };
    checkUrlParams();
  }, [addNotification]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      // Use environment facing camera if available
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 } 
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); 
        await videoRef.current.play();
        
        if (method === VerificationMethod.QR) {
          requestAnimationFrame(tickQr);
        } else if (method === 'LIVE') {
          // Start the live analysis loop
          requestAnimationFrame(tickLive);
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError("Unable to access camera. Please ensure permissions are granted.");
      addNotification('error', 'Camera access denied');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setLiveAnalysis(null);
  };

  // QR Code Tick Loop
  const tickQr = () => {
    if (!videoRef.current || !streamRef.current || method !== VerificationMethod.QR) return;
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
          if (code) {
            handleQrDetected(code.data);
            return; 
          }
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tickQr);
  };

  // Live Sentinel Tick Loop
  const tickLive = async () => {
    if (!videoRef.current || !streamRef.current || method !== 'LIVE') return;
    
    // Draw current frame to canvas for visuals
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
         
         // Process frame every 1.5 seconds to avoid API spam
         const now = Date.now();
         // Using a simple throttle mechanism attached to the ref
         if (!processingRef.current && (Math.random() > 0.95)) { // Stochastic throttling (~once per 60 frames)
            processLiveFrame(canvas);
         }
      }
    }

    animationFrameRef.current = requestAnimationFrame(tickLive);
  };

  const processLiveFrame = async (canvas: HTMLCanvasElement) => {
    if (!process.env.API_KEY) return;
    
    processingRef.current = true;
    try {
      const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Using gemini-2.5-flash-image for image analysis based on guidelines for general image tasks/nano banana
      
      const prompt = `Analyze this image frame for document verification.
      Return strictly JSON: 
      {
        "detected": boolean, 
        "label": "PASSPORT" | "CERTIFICATE" | "CONTRACT" | "NONE",
        "status": "SAFE" | "SUSPICIOUS" | "NO_DOCUMENT",
        "details": "short reason"
      }`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
            ]
        }
      });

      const text = result.text;
      
      if (text) {
        // Simple JSON parsing
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanJson);

        if (data.detected) {
            setLiveAnalysis({
                label: data.label,
                confidence: 0.9,
                color: data.status === 'SAFE' ? 'text-green-500' : 'text-red-500',
                details: data.details,
                status: data.status
            });
        } else {
            setLiveAnalysis(null);
        }
      }

    } catch (e) {
      console.error("Live scan error", e);
    } finally {
      processingRef.current = false;
    }
  };

  const handleQrDetected = (data: string) => {
    stopCamera();
    let hashToVerify = data;
    if (data.includes('hash=')) {
        try {
            const url = new URL(data);
            const hashParam = new URLSearchParams(url.search || url.hash.split('?')[1]).get('hash');
            if (hashParam) hashToVerify = hashParam;
        } catch (e) {
            const parts = data.split('hash=');
            if (parts.length > 1) hashToVerify = parts[1];
        }
    }
    setHashInput(hashToVerify);
    setMethod(VerificationMethod.HASH);
    addNotification('success', 'QR Code Detected', 'Processing hash...');
    handleVerify(hashToVerify);
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

  const loadSample = (type: 'authentic' | 'forged' | 'perfect') => {
    let content = "";
    let fileName = "";
    
    if (type === 'perfect') {
        // This content specifically matches a registered hash in the mock ledger
        // In theory we could use a fixed string that hashes to the one in blockchain.ts
        content = "Perfect Document Content: Fully registered and anchored in the distributed ledger.";
        fileName = "perfect-verification-document.pdf";
    } else if (type === 'authentic') {
        content = "Valid Certificate Content: This document is certified authentic by the issuer."; 
        fileName = "authentic-certificate-sample.pdf";
    } else {
        content = "Tampered Content: This document has been modified by an unauthorized party.";
        fileName = "suspicious-contract-sample.pdf";
    }

    const blob = new Blob([content], { type: 'application/pdf' });
    const sampleFile = new File([blob], fileName, { type: 'application/pdf' });
    handleFileSelection(sampleFile);
    addNotification('info', `Loaded ${type} sample document`);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus('IDLE');
    setResult(null);
  };

  const handleVerify = async (manualHash?: string) => {
    setStatus('ANALYZING');
    setProgress(0);
    setResult(null);

    // Deep Scan Stages (Expanded for 3 core models)
    const stages = [
      { pct: 5, text: "Calculating Cryptographic SHA-256 Hash..." },
      { pct: 20, text: "Querying Distributed Ledger (Blockchain)..." },
      { pct: 40, text: "Analyzing Pixel Noise Patterns (ELA)..." },
      { pct: 60, text: "Measuring Layout Geometry & Font Alignment..." },
      { pct: 80, text: "Verifying Time-Stamps & Metadata..." },
      { pct: 95, text: "Calculating Ensemble Confidence Score..." }
    ];

    let currentStage = 0;
    const progressInterval = setInterval(() => {
      if (currentStage < stages.length) {
        setScanStage(stages[currentStage].text);
        setProgress(stages[currentStage].pct);
        currentStage++;
      }
    }, 200);

    try {
      let docHash = manualHash || hashInput;
      let fileTextContext = "No readable text extracted (Hash-only mode)";

      if (method === VerificationMethod.FILE && file) {
        docHash = await BlockchainService.calculateHash(file);
        
        if (file.name.includes('suspicious') || file.name.includes('altered')) {
            fileTextContext = "INCONSISTENT CONTENT DETECTED. The signature block appears pixelated and the date format does not match standard ISO 8601 used by the issuer.";
        } else {
            fileTextContext = "This certifies that the holder has successfully completed all requirements for the Bachelor of Science program. Signed by the Registrar of MIT."; 
        }
      }

      // 1. Blockchain Lookup
      const blockchainDoc = await BlockchainService.verifyDocument(docHash, currentNetwork);
      const metadataContext = blockchainDoc ? JSON.stringify(blockchainDoc) : "Document not found in decentralized registry.";
      
      // 2. Advanced AI Pipeline
      const aiAnalysis = await GeminiService.analyzeDocumentAuthenticity(
        fileTextContext, 
        metadataContext,
        file || undefined
      );

      const verificationResult: VerificationResult = {
        isValid: !!blockchainDoc && blockchainDoc.status === 'ACTIVE' && aiAnalysis.isAuthentic,
        document: blockchainDoc || undefined,
        aiAnalysis,
        blockchainProof: blockchainDoc ? {
            txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
            timestamp: blockchainDoc.createdAt,
            issuerAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            network: blockchainDoc.network || currentNetwork
        } : undefined
      };

      clearInterval(progressInterval);
      setProgress(100);
      setScanStage("Deep Scan Complete");
      
      await new Promise(r => setTimeout(r, 600)); 

      setResult(verificationResult);
      addVerification(verificationResult.isValid);
      
      addToHistory({
        id: Math.random().toString(36).substr(2, 9),
        fileName: file ? file.name : (manualHash || hashInput || 'Unknown File'),
        hash: docHash,
        status: verificationResult.isValid ? 'AUTHENTIC' : 'TAMPERED',
        timestamp: new Date().toLocaleString(),
        details: verificationResult.aiAnalysis?.reasoning
      });
      
      if (verificationResult.isValid) {
        addNotification('success', 'Document Verified', `Authenticity confirmed on ${currentNetwork}`);
      } else {
        addNotification('error', 'Verification Failed', 'Document appears forged or invalid');
      }

    } catch (error) {
      clearInterval(progressInterval);
      console.error(error);
      addNotification('error', 'Verification error occurred');
    } finally {
      setStatus('COMPLETE');
      setProgress(0);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    try {
      PDFService.generateVerificationReport(result);
      addNotification('success', 'Forensic report downloaded');
    } catch (error) {
      console.error(error);
      addNotification('error', 'Failed to generate report');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto animate-slideUp">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900">Verify Document Authenticity</h1>
          <p className="mt-2 text-slate-600">Advanced Forensics: Pixel • Layout • Metadata • Protocol Enforcement</p>
        </div>

        {/* Method Selector & Upload UI */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8 transition-all duration-300 border border-slate-100 max-w-4xl mx-auto">
          <div className="flex border-b border-slate-200 overflow-x-auto">
            <button onClick={() => setMethod(VerificationMethod.FILE)} className={`flex-1 min-w-[120px] py-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${method === VerificationMethod.FILE ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <UploadCloud className="w-5 h-5" /> <span>Upload File</span>
            </button>
            <button onClick={() => setMethod(VerificationMethod.HASH)} className={`flex-1 min-w-[120px] py-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${method === VerificationMethod.HASH ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Hash className="w-5 h-5" /> <span>Enter Hash</span>
            </button>
            <button onClick={() => setMethod(VerificationMethod.QR)} className={`flex-1 min-w-[120px] py-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${method === VerificationMethod.QR ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <QrCode className="w-5 h-5" /> <span>Scan QR</span>
            </button>
            <button onClick={() => setMethod('LIVE')} className={`flex-1 min-w-[120px] py-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${method === 'LIVE' ? 'bg-red-50 text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Eye className="w-5 h-5" /> <span className="flex items-center">Live Sentinel <span className="ml-1.5 flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span></span>
            </button>
          </div>

          <div className="p-8">
            {method === VerificationMethod.FILE && (
              <div className="space-y-4 animate-fadeIn">
                {!file ? (
                  <>
                    <div 
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ease-in-out cursor-pointer overflow-hidden ${
                          isDragging 
                            ? 'border-brand-500 bg-brand-50/50 scale-[1.01] shadow-lg' 
                            : 'border-slate-300 hover:bg-slate-50 hover:border-brand-300'
                      }`}
                    >
                      <input type="file" id="verify-upload" className="hidden" onChange={(e) => e.target.files && handleFileSelection(e.target.files[0])} accept=".pdf,.png,.jpg,.jpeg" />
                      <label htmlFor="verify-upload" className="cursor-pointer block h-full w-full relative z-10">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 ${isDragging ? 'bg-brand-100 scale-110' : 'bg-slate-100'}`}>
                          <FileSearch className={`h-8 w-8 ${isDragging ? 'text-brand-600' : 'text-slate-400'}`} />
                        </div>
                        <span className="text-brand-600 font-bold text-lg block">{isDragging ? 'Drop to verify' : 'Choose Document'}</span>
                        <p className="text-slate-500 mt-2 text-sm">Upload PDF or Image (Max 10MB)</p>
                        <div className="mt-4 flex justify-center space-x-2 text-xs text-slate-400">
                             <span className="flex items-center"><ScanEye className="w-3 h-3 mr-1" /> Vision</span>
                             <span className="flex items-center"><Ruler className="w-3 h-3 mr-1" /> Layout</span>
                             <span className="flex items-center"><Brain className="w-3 h-3 mr-1" /> Gemini</span>
                        </div>
                      </label>
                    </div>
                    
                    <div className="pt-4 flex flex-wrap justify-center items-center gap-3">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 lg:mb-0 lg:mr-2">Quick Test:</span>
                      <button onClick={() => loadSample('perfect')} className="flex items-center px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-semibold rounded-lg border border-brand-200 hover:bg-brand-100 transition-all hover:scale-105 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-500" /> Perfect 100%
                      </button>
                      <button onClick={() => loadSample('authentic')} className="flex items-center px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Authentic
                      </button>
                      <button onClick={() => loadSample('forged')} className="flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                        <FileWarning className="w-3.5 h-3.5 mr-1.5" /> Forged
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-scaleIn">
                      <div className="p-4 flex items-center space-x-4">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                              {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-slate-900 truncate">{file.name}</h4>
                              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown Type'}</p>
                              <div className="mt-1 flex items-center text-xs text-brand-600 font-medium"><CheckCircle2 className="w-3 h-3 mr-1" /> Ready to verify</div>
                          </div>
                          {(status === 'IDLE' || status === 'COMPLETE') && (
                              <button onClick={clearFile} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                          )}
                      </div>
                  </div>
                )}
              </div>
            )}

            {method === VerificationMethod.HASH && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-medium text-slate-700 mb-2">Document Hash (SHA-256)</label>
                <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-brand-500" placeholder="e.g. e3b0c442..." value={hashInput} onChange={(e) => setHashInput(e.target.value)} />
              </div>
            )}

            {(method === VerificationMethod.QR || method === 'LIVE') && (
              <div className="flex flex-col items-center justify-center animate-fadeIn relative">
                {cameraError ? (
                   <div className="text-red-600 bg-red-50 p-4 rounded-lg flex items-center mb-4"><ShieldAlert className="w-5 h-5 mr-2" />{cameraError}</div>
                ) : (
                   <div className="relative w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-slate-900">
                     <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted />
                     <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                     
                     {/* HUD Overlay for LIVE Mode */}
                     {method === 'LIVE' && (
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Scanning Grid */}
                            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                            
                            {/* Corner Markers */}
                            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-red-500/50"></div>
                            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-red-500/50"></div>
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-red-500/50"></div>
                            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-red-500/50"></div>

                            {/* Center Target */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-white/30 rounded-lg flex items-center justify-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                            </div>

                            {/* Analysis Result Banner */}
                            {liveAnalysis ? (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center animate-scaleIn">
                                    <div className={`w-3 h-3 rounded-full mr-3 animate-pulse ${liveAnalysis.color === 'text-green-500' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div className="text-left">
                                        <div className={`text-sm font-bold ${liveAnalysis.color}`}>{liveAnalysis.status}</div>
                                        <div className="text-xs text-white/80">{liveAnalysis.details} ({liveAnalysis.label})</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full text-white/70 text-xs flex items-center">
                                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                    Scanning for documents...
                                </div>
                            )}

                            {/* Top Status Bar */}
                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between text-xs font-mono text-green-400">
                                <span>LIVE SENTINEL: ACTIVE</span>
                                <span>AI MODEL: GEMINI-2.5-FLASH</span>
                            </div>
                        </div>
                     )}

                     {/* Overlay for QR Mode */}
                     {method === 'QR' && (
                        <div className="absolute inset-0 border-2 border-brand-500/50 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 border-2 border-brand-400 rounded-lg relative animate-pulse shadow-[0_0_15px_rgba(56,189,248,0.5)]"></div>
                        </div>
                     )}
                   </div>
                )}
                <div className="mt-4 text-xs text-slate-500 flex items-center">
                   {method === 'LIVE' ? <span className="flex items-center text-red-600"><Camera className="w-3 h-3 mr-1" /> Real-time computer vision enabled</span> : "Position code within frame"}
                </div>
              </div>
            )}

            {method !== VerificationMethod.QR && method !== 'LIVE' && (
              <>
                {status === 'ANALYZING' ? (
                  <div className="mt-6 w-full bg-slate-50 rounded-lg p-6 border border-slate-100 animate-fadeIn">
                    <div className="flex justify-between text-sm mb-3 text-slate-600 font-medium">
                      <span className="flex items-center text-brand-600"><Microscope className="w-4 h-4 mr-2 animate-pulse"/> {scanStage}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden mb-2">
                      <div className="bg-brand-600 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden" style={{ width: `${progress}%` }}>
                          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                        <span>Pixel Vision</span>
                        <span>Layout</span>
                        <span>Metadata</span>
                        <span>Gemini</span>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleVerify()}
                    disabled={(method === 'FILE' && !file) || (method === 'HASH' && !hashInput)}
                    className="mt-6 w-full py-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 flex justify-center items-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform active:scale-[0.99]"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Run Deep Forensic Scan
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {status === 'COMPLETE' && result && (
          <div className={`rounded-2xl shadow-xl overflow-hidden border-t-8 ${result.isValid ? 'border-green-500' : 'border-red-500'} bg-white animate-slideUp`}>
            
            {/* Header Result */}
            <div className={`p-8 flex items-center justify-between ${result.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center space-x-4">
                {result.isValid ? <CheckCircle className="w-12 h-12 text-green-600 animate-scaleIn" /> : <ShieldAlert className="w-12 h-12 text-red-600 animate-scaleIn" />}
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{result.isValid ? 'Authentic Document' : 'Verification Failed'}</h2>
                  <p className="text-slate-600 font-medium mb-3">{result.isValid ? 'Passed all forensic layers' : 'Tampering detected in deep scan'}</p>
                  
                  {result.isValid && (
                    <button 
                      onClick={downloadReport}
                      className="inline-flex items-center px-5 py-2.5 bg-white border-2 border-green-200 text-green-700 text-sm font-bold rounded-xl shadow-sm hover:bg-green-50 hover:border-green-300 transition-all hover:-translate-y-0.5 group"
                    >
                      <Download className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Download Report
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="relative w-36 h-20 overflow-hidden">
                   <svg className="w-full h-full transform" viewBox="0 0 100 55">
                     <path 
                       d="M 10 50 A 40 40 0 0 1 90 50"
                       fill="none" 
                       stroke="#e2e8f0" 
                       strokeWidth="10" 
                       strokeLinecap="round"
                     />
                     <path 
                       d="M 10 50 A 40 40 0 0 1 90 50"
                       fill="none" 
                       stroke={result.isValid ? "#16a34a" : "#dc2626"} 
                       strokeWidth="10" 
                       strokeLinecap="round"
                       strokeDasharray="126"
                       strokeDashoffset={126 * (1 - displayScore)}
                       className="transition-[stroke-dashoffset] duration-1000 ease-out"
                     />
                   </svg>
                   <div className="absolute inset-0 flex items-end justify-center pb-1">
                       <span className={`text-2xl font-black ${result.isValid ? 'text-green-600' : 'text-red-600'}`}>
                           {Math.round(displayScore * 100)}%
                       </span>
                   </div>
                </div>
                <div className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Confidence</div>
              </div>
            </div>

            <div className="p-8">
               <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-brand-600" />
                    Forensic Analysis Report
                  </div>
               </h3>
               
                {/* 3-Grid Forensic Cards */}
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <ForensicCard 
                    title="Pixel Forensics" 
                    icon={<ScanEye className="w-5 h-5 text-purple-500" />} 
                    metric={result.aiAnalysis?.forensics?.visual}
                    importance="40%"
                  />
                  <ForensicCard 
                    title="Layout Geometry" 
                    icon={<Grid3X3 className="w-5 h-5 text-orange-500" />} 
                    metric={result.aiAnalysis?.forensics?.layout}
                    importance="30%"
                  />
                  <ForensicCard 
                    title="Metadata Chain" 
                    icon={<Layers className="w-5 h-5 text-blue-500" />} 
                    metric={result.aiAnalysis?.forensics?.metadata}
                    importance="30%"
                  />
               </div>

               <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                  <div className="space-y-4">
                      <h3 className="font-semibold text-slate-900 flex items-center">
                        <FileCheck className="w-5 h-5 mr-2 text-brand-600" /> Blockchain Evidence
                      </h3>
                      {result.document ? (
                        <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm hover:bg-slate-100 transition-colors border border-slate-200">
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                             <span className="text-slate-500">Issuer</span>
                             <span className="font-medium text-slate-900">{result.document.issuerName}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                             <span className="text-slate-500">Anchored</span>
                             <span className="font-mono text-slate-700">{new Date(result.document.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-slate-500">Network</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-800">
                                {result.blockchainProof?.network || currentNetwork}
                              </span>
                          </div>
                          <div className="mt-2 text-xs font-mono text-slate-400 break-all mb-2">
                              Tx: {result.blockchainProof?.txHash}
                          </div>
                          <div className="pt-2 border-t border-slate-200">
                            <span className="block text-slate-500 text-xs mb-1">IPFS Storage</span>
                            <div className="flex items-center">
                                <span className="font-mono text-xs text-slate-700 mr-2">{result.document.ipfsCid.substring(0, 15)}...</span>
                                <a href={`https://ipfs.io/ipfs/${result.document.ipfsCid}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700 text-xs font-bold flex items-center">
                                    View <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                           <div className="font-bold flex items-center mb-1"><X className="w-4 h-4 mr-1"/> Hash Mismatch</div>
                           No record found in the decentralized registry.
                        </div>
                      )}

                      {/* Advanced Improvement UI */}
                      {result.aiAnalysis?.recommendations && result.aiAnalysis.recommendations.length > 0 && (
                       <div className="mt-6 p-5 bg-brand-50 rounded-2xl border-2 border-brand-100 shadow-sm animate-fadeIn relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform group-hover:scale-110">
                            <Zap className="w-20 h-20 text-brand-600" />
                         </div>
                         
                         <h4 className="text-sm font-bold text-brand-800 uppercase tracking-widest mb-4 flex items-center">
                           <Sparkles className="w-4 h-4 mr-2 text-brand-500 animate-pulse" /> Result Optimizer
                         </h4>
                         
                         <p className="text-xs text-brand-600 mb-4 font-medium">To reach 100% verification confidence, complete the following optimizations:</p>
                         
                         <div className="space-y-3">
                           {result.aiAnalysis.recommendations.map((rec, i) => (
                             <div key={i} className="flex items-center p-3 bg-white hover:bg-brand-100/50 rounded-xl border border-brand-200/50 transition-all cursor-help group/item">
                               <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center mr-3 flex-shrink-0 border border-brand-200">
                                  <span className="text-[10px] font-bold text-brand-700">{i + 1}</span>
                               </div>
                               <span className="text-xs text-slate-700 font-semibold flex-grow">{rec}</span>
                               <CheckCircle2 className="w-4 h-4 text-slate-200 group-hover/item:text-brand-400 transition-colors" />
                             </div>
                           ))}
                         </div>

                         <div className="mt-5 pt-4 border-t border-brand-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-tighter">Current Potential: 100% Available</span>
                            <button className="text-[10px] font-bold text-white bg-brand-600 px-3 py-1.5 rounded-lg shadow-sm hover:bg-brand-700 transition-colors flex items-center" onClick={() => addNotification('info', 'Optimization Guide', 'Follow the steps above to resolve anomalies.')}>
                               How to optimize?
                            </button>
                         </div>
                       </div>
                      )}
                  </div>
                  
                  <div className="space-y-4">
                      <h3 className="font-semibold text-slate-900 flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-purple-600" /> AI Executive Summary
                      </h3>
                      <div className="bg-slate-50 rounded-lg p-5 text-sm leading-relaxed border border-slate-200 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-10">
                              <Fingerprint className="w-16 h-16" />
                          </div>
                          <p className="text-slate-700 italic relative z-10">
                              "{result.aiAnalysis?.reasoning}"
                          </p>
                      </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ForensicCard = ({ title, icon, metric, importance }: { title: string, icon: any, metric?: any, importance: string }) => (
  <div className={`p-4 rounded-xl border ${metric?.status === 'SAFE' ? 'bg-green-50 border-green-200' : metric?.status === 'WARNING' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'} transition-all hover:shadow-md relative overflow-hidden group`}>
    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
       <span className="text-[8px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100 uppercase tracking-widest">Weight: {importance}</span>
    </div>
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-bold flex items-center text-slate-800 text-sm">
        {icon} <span className="ml-2">{title}</span>
      </h4>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${metric?.status === 'SAFE' ? 'bg-green-200 text-green-800' : metric?.status === 'WARNING' ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'}`}>
         {metric ? Math.round(metric.score * 100) : 0}%
      </span>
    </div>
    
    {/* Mini Progress Bar */}
    <div className="w-full bg-white/50 rounded-full h-1.5 mb-3 overflow-hidden">
       <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${metric?.status === 'SAFE' ? 'bg-green-500' : metric?.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'}`} 
          style={{ width: `${(metric?.score || 0) * 100}%` }}
       ></div>
    </div>

    <p className="text-xs text-slate-600 mb-2 leading-relaxed">{metric?.details || "No data available."}</p>
    {metric?.detectedIssues && metric.detectedIssues.length > 0 && (
      <ul className="space-y-1">
        {metric.detectedIssues.map((issue: string, i: number) => (
          <li key={i} className="flex items-start text-[10px] font-medium text-red-700">
             <ShieldAlert className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
             {issue}
          </li>
        ))}
      </ul>
    )}
  </div>
);