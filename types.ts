
export enum DocumentStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  SUSPICIOUS = 'SUSPICIOUS',
  PENDING = 'PENDING'
}

export type UserRole = 'GUEST' | 'ISSUER' | 'ADMIN' | 'VERIFIER';

export type NetworkType = 'SEPOLIA' | 'MAINNET' | 'POLYGON' | 'BNB' | 'AVALANCHE' | 'HYPERLEDGER';

export enum GasStrategy {
  STANDARD = 'STANDARD',
  ECONOMY = 'ECONOMY', // Batched/Lower Priority
  URGENT = 'URGENT'    // High Priority
}

export interface DocumentMetadata {
  id: string;
  title: string;
  type: string;
  issuerName: string;
  description: string;
  expiryDate?: string;
  createdAt: string;
  hash: string;
  ipfsCid: string;
  status: DocumentStatus;
  aiForgeryScore?: number;
  network?: NetworkType;
  txHash?: string;
}

export interface ForensicMetric {
  score: number; // 0 to 1
  status: 'SAFE' | 'WARNING' | 'CRITICAL';
  details: string;
  detectedIssues?: string[];
}

export interface VerificationResult {
  isValid: boolean;
  document?: DocumentMetadata;
  blockchainProof?: {
    txHash: string;
    timestamp: string;
    issuerAddress: string;
    network: NetworkType;
  };
  aiAnalysis?: {
    isAuthentic: boolean;
    confidence: number;
    reasoning: string;
    flags: string[];
    recommendations?: string[];
    forensics: {
      visual: ForensicMetric;  // Pixel/Noise Analysis
      layout: ForensicMetric;  // New: Layout/Font Analysis
      metadata: ForensicMetric; // Time/Chain Analysis
      content: ForensicMetric; // Semantic/LLM Analysis
      overallScore: number;
    };
  };
}

export interface LiveVerification {
  id: string;
  docId: string;
  status: 'VERIFIED' | 'FAILED';
  timestamp: string;
  location: string;
}

export enum VerificationMethod {
  FILE = 'FILE',
  HASH = 'HASH',
  QR = 'QR'
}