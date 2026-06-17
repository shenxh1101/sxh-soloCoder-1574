export interface Medicine {
  id: string;
  name: string;
  category: string;
  specification: string;
  sellPrice: number;
  safetyStock: number;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  quantity: number;
  costPrice: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  mainCategory: string;
  createdAt: string;
}

export interface SaleRecord {
  id: string;
  medicineId: string;
  batchId?: string;
  quantity: number;
  freeQuantity: number;
  unitPrice: number;
  totalAmount: number;
  profit: number;
  promotionId?: string;
  saleTime: string;
}

export interface StockRecord {
  id: string;
  medicineId: string;
  batchId?: string;
  quantity: number;
  costPrice: number;
  type: 'in' | 'out';
  operationTime: string;
  remark?: string;
}

export interface Promotion {
  id: string;
  name: string;
  type: 'buy_get_free' | 'discount';
  medicineId: string;
  buyQuantity: number;
  freeQuantity: number;
  discount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export type ExpiryStatus = 'expired' | 'urgent' | 'warning' | 'normal';

export type StockAlertStatus = 'out_of_stock' | 'critical' | 'warning' | 'normal';

export const MEDICINE_CATEGORIES = [
  '感冒药',
  '降压药',
  '消炎药',
  '维生素',
  '止痛药',
  '胃药',
  '外用药',
  '其他',
];
