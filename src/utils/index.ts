import type { ExpiryStatus, StockAlertStatus, Promotion } from '@/types';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
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

export function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getExpiryStatus(daysUntilExpiry: number): ExpiryStatus {
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
    const groupSize = promotion.buyQuantity + promotion.freeQuantity;
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
