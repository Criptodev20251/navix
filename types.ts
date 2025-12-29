
export type OperationType = 'import' | 'export';

export enum ProcessStatus {
  PENDING = 'Pendente',
  IN_PROGRESS = 'Em andamento',
  COMPLETED = 'Finalizado',
  ATTENTION = 'Atenção'
}

export interface Process {
  id: string;
  user_id?: string;
  code: string;
  type: OperationType;
  product: string;
  origin: string;
  destination: string;
  status: string; // Changed to string to match DB flexibility
  progress: number;
  created_at?: string;
  updatedAt?: string; // Legacy support
}

export enum DocStatus {
  PENDING = 'Pendente',
  VALIDATED = 'Validado',
  REJECTED = 'Rejeitado',
  UPLOADING = 'Enviando...'
}

export interface DocumentItem {
  id: string;
  process_id?: string;
  name: string;
  type: string;
  date: string;
  status: string; // Changed to string to match DB
  size?: string;
  url?: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  description: string;
  amount: number;
  created_at: string;
  date?: string; // Legacy
  type: 'debit' | 'credit';
  category: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  timestamp?: string; // Legacy
  read: boolean;
  type: 'success' | 'warning' | 'info';
}

export interface UserProfile {
  id: string;
  email: string;
  company_name: string;
  balance: number;
}

export interface WizardData {
  // Step 1
  operationType: OperationType;
  originCountry: string;
  destinationCountry: string;
  productName: string;
  ncmCode: string;
  
  // Step 2 (Files)
  files: DocumentItem[];

  // Step 3 (Payment)
  totalValue: number;
  estimatedTaxes: number;
}
