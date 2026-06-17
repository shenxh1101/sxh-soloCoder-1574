import type { ExpiryStatus, StockAlertStatus, Promotion, MedicineBatch } from '@/types';

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function getDaysUntilExpiry(expiryDate: string | undefined | null): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getExpiryStatus(daysUntilExpiry: number | null): ExpiryStatus {
  if (daysUntilExpiry === null) return 'normal';
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'urgent';
  if (daysUntilExpiry <= 30) return 'warning';
  return 'normal';
}

export function getExpiryStatusText(status: ExpiryStatus): string {
  const statusMap: Record<ExpiryStatus, string> = {
    expired: '已过期',
    urgent: '即将过期',
    warning: '临近过期',
    normal: '正常',
  };
  return statusMap[status];
}

export function getExpiryStatusColor(status: ExpiryStatus): string {
  const colorMap: Record<ExpiryStatus, string> = {
    expired: 'text-red-600 bg-red-50 border-red-200',
    urgent: 'text-red-500 bg-red-50 border-red-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    normal: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  };
  return colorMap[status];
}

export function getStockAlertStatus(
  stock: number,
  safetyStock: number
): StockAlertStatus {
  if (stock <= 0) return 'out_of_stock';
  if (stock < safetyStock * 0.5) return 'critical';
  if (stock <= safetyStock) return 'warning';
  return 'normal';
}

export function getStockAlertStatusText(status: StockAlertStatus): string {
  const statusMap: Record<StockAlertStatus, string> = {
    out_of_stock: '缺货',
    critical: '库存严重不足',
    warning: '库存不足',
    normal: '正常',
  };
  return statusMap[status];
}

export function getStockAlertColor(status: StockAlertStatus): string {
  const colorMap: Record<StockAlertStatus, string> = {
    out_of_stock: 'text-red-600 bg-red-50 border-red-200',
    critical: 'text-orange-600 bg-orange-50 border-orange-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    normal: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  };
  return colorMap[status];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateBatchNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `B${year}${month}${day}${random}`;
}

export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function isPromotionActive(promotion: Promotion): boolean {
  if (!promotion.isActive) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(promotion.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(promotion.endDate);
  end.setHours(23, 59, 59, 999);
  return today >= start && today <= end;
}

export function calculatePromotionPrice(
  promotion: Promotion,
  quantity: number,
  originalPrice: number
): { finalPrice: number; freeQuantity: number; totalQuantity: number } {
  if (promotion.type === 'buy_get_free') {
    const fullGroups = Math.floor(quantity / promotion.buyQuantity);
    const freeQty = fullGroups * promotion.freeQuantity;
    const totalQty = quantity + freeQty;
    const finalPrice = quantity * originalPrice;
    return { finalPrice, freeQuantity: freeQty, totalQuantity: totalQty };
  } else if (promotion.type === 'discount') {
    const finalPrice = quantity * originalPrice * promotion.discount;
    return { finalPrice, freeQuantity: 0, totalQuantity: quantity };
  }
  return { finalPrice: quantity * originalPrice, freeQuantity: 0, totalQuantity: quantity };
}

export function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

export function isDateInRange(dateStr: string, startStr: string, endStr: string): boolean {
  const date = new Date(dateStr);
  const start = new Date(startStr);
  const end = new Date(endStr);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

export function sortBatchesByExpiry(batches: MedicineBatch[]): MedicineBatch[] {
  return [...batches].sort((a, b) => {
    const daysA = getDaysUntilExpiry(a.expiryDate);
    const daysB = getDaysUntilExpiry(b.expiryDate);
    if (daysA === null && daysB === null) return 0;
    if (daysA === null) return 1;
    if (daysB === null) return -1;
    return daysA - daysB;
  });
}

export function getTotalStock(batches: MedicineBatch[]): number {
  return batches.reduce((sum, b) => sum + b.quantity, 0);
}

export function getAverageCostPrice(batches: MedicineBatch[]): number {
  const total = batches.reduce((sum, b) => sum + b.quantity * b.costPrice, 0);
  const qty = getTotalStock(batches);
  return qty > 0 ? total / qty : 0;
}

export function getEarliestExpiryDate(batches: MedicineBatch[]): string | null {
  if (batches.length === 0) return null;
  const sorted = sortBatchesByExpiry(batches);
  return sorted[0]?.expiryDate || null;
}

export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
