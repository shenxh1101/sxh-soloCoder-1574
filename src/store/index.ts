import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Medicine,
  MedicineBatch,
  Supplier,
  SaleRecord,
  StockRecord,
  Promotion,
  StockCheck,
  StockCheckItem,
  StockCheckStatus,
  OrderRecord,
  OrderItem,
  OrderStatus,
  BatchStatus,
} from '@/types';
import {
  generateId,
  generateBatchNo,
  isPromotionActive,
  calculatePromotionPrice,
  sortBatchesByExpiry,
  getTotalStock,
  getAverageCostPrice,
  formatDate,
} from '@/utils';

interface AppState {
  medicines: Medicine[];
  batches: MedicineBatch[];
  suppliers: Supplier[];
  saleRecords: SaleRecord[];
  stockRecords: StockRecord[];
  promotions: Promotion[];
  stockChecks: StockCheck[];
  orders: OrderRecord[];

  addMedicine: (
    medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>,
    initialBatch?: Omit<MedicineBatch, 'id' | 'medicineId' | 'batchNo' | 'createdAt' | 'status'>
  ) => void;
  updateMedicine: (id: string, medicine: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  getMedicineBatches: (medicineId: string) => MedicineBatch[];
  getMedicineStock: (medicineId: string) => number;
  getSellableStock: (medicineId: string) => number;
  getMedicineCostPrice: (medicineId: string) => number;

  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addBatch: (
    medicineId: string,
    batchData: Omit<MedicineBatch, 'id' | 'medicineId' | 'batchNo' | 'createdAt' | 'status'>
  ) => void;
  updateBatchStatus: (batchId: string, status: BatchStatus) => void;
  getSellableBatches: (medicineId: string) => MedicineBatch[];

  addSale: (
    medicineId: string,
    quantity: number,
    unitPrice?: number,
    promotionId?: string
  ) => {
    success: boolean;
    message?: string;
    usedBatches?: { batchId: string; quantity: number }[];
  };

  addPromotion: (promotion: Omit<Promotion, 'id' | 'createdAt'>) => void;
  updatePromotion: (id: string, promotion: Partial<Promotion>) => void;
  deletePromotion: (id: string) => void;
  togglePromotionActive: (id: string) => void;

  getActivePromotion: (medicineId: string) => Promotion | null;
  getReplenishmentList: () => {
    medicine: Medicine;
    supplier: Supplier;
    currentStock: number;
    safetyStock: number;
    suggestedQuantity: number;
  }[];

  createStockCheck: (data: {
    title: string;
    items: { medicineId: string; batchId: string; actualQuantity: number }[];
    remark?: string;
  }) => string;
  updateStockCheck: (
    checkId: string,
    data: {
      title?: string;
      items?: { medicineId: string; batchId: string; actualQuantity: number }[];
      remark?: string;
    }
  ) => boolean;
  deleteStockCheck: (checkId: string) => boolean;
  confirmStockCheck: (checkId: string) => boolean;
  getStockChecks: () => StockCheck[];

  createOrderFromReplenishment: (
    supplierId: string,
    items: { medicineId: string; quantity: number; costPrice: number }[]
  ) => string;
  getOrders: () => OrderRecord[];
  confirmOrderArrival: (
    orderId: string,
    arrivalItems: {
      orderItemId: string;
      quantity: number;
      productionDate?: string;
      expiryDate?: string;
      costPrice?: number;
    }[]
  ) => { success: boolean; batchIds?: string[] };
}

const initialMedicines: Medicine[] = [
  {
    id: 'med_001',
    name: '感冒灵颗粒',
    category: '感冒药',
    specification: '10g*9袋',
    sellPrice: 15.8,
    safetyStock: 20,
    supplierId: 'sup_001',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_002',
    name: '硝苯地平缓释片',
    category: '降压药',
    specification: '10mg*30片',
    sellPrice: 22.5,
    safetyStock: 15,
    supplierId: 'sup_002',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_003',
    name: '阿莫西林胶囊',
    category: '消炎药',
    specification: '0.25g*24粒',
    sellPrice: 12.0,
    safetyStock: 10,
    supplierId: 'sup_001',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_004',
    name: '维生素C片',
    category: '维生素',
    specification: '100mg*100片',
    sellPrice: 9.9,
    safetyStock: 30,
    supplierId: 'sup_003',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_005',
    name: '布洛芬缓释胶囊',
    category: '止痛药',
    specification: '0.3g*20粒',
    sellPrice: 18.8,
    safetyStock: 15,
    supplierId: 'sup_002',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_006',
    name: '奥美拉唑肠溶胶囊',
    category: '胃药',
    specification: '20mg*14粒',
    sellPrice: 28.0,
    safetyStock: 20,
    supplierId: 'sup_003',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
];

const initialBatches: MedicineBatch[] = [
  {
    id: 'bat_001',
    medicineId: 'med_001',
    batchNo: 'B250315001',
    productionDate: '2025-03-15',
    expiryDate: '2026-09-14',
    quantity: 30,
    costPrice: 8.5,
    status: 'normal',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'bat_002',
    medicineId: 'med_001',
    batchNo: 'B250510002',
    productionDate: '2025-05-10',
    expiryDate: '2026-12-09',
    quantity: 15,
    costPrice: 8.2,
    status: 'normal',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'bat_003',
    medicineId: 'med_002',
    batchNo: 'B250120001',
    productionDate: '2025-01-20',
    expiryDate: '2026-07-19',
    quantity: 8,
    costPrice: 12.0,
    status: 'normal',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'bat_004',
    medicineId: 'med_003',
    batchNo: 'B250410001',
    productionDate: '2025-04-10',
    expiryDate: '2026-06-25',
    quantity: 3,
    costPrice: 6.8,
    status: 'normal',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'bat_005',
    medicineId: 'med_004',
    batchNo: 'B250228001',
    productionDate: '2025-02-28',
    expiryDate: '2027-02-27',
    quantity: 120,
    costPrice: 5.0,
    status: 'normal',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'bat_006',
    medicineId: 'med_005',
    batchNo: 'B250501001',
    productionDate: '2025-05-01',
    expiryDate: '2026-12-30',
    quantity: 25,
    costPrice: 10.5,
    status: 'normal',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'bat_007',
    medicineId: 'med_006',
    batchNo: 'B250308001',
    productionDate: '2025-03-08',
    expiryDate: '2026-08-07',
    quantity: 50,
    costPrice: 15.0,
    status: 'normal',
    createdAt: '2025-06-01T08:00:00Z',
  },
];

const initialSuppliers: Supplier[] = [
  {
    id: 'sup_001',
    name: '华康医药批发',
    contactPerson: '张经理',
    phone: '13812345678',
    address: '北京市朝阳区建国路88号',
    mainCategory: '感冒药、消炎药',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'sup_002',
    name: '仁康药业',
    contactPerson: '李女士',
    phone: '13987654321',
    address: '上海市浦东新区张江路100号',
    mainCategory: '降压药、止痛药',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'sup_003',
    name: '健康源医药',
    contactPerson: '王总',
    phone: '13611112222',
    address: '广州市天河区体育西路200号',
    mainCategory: '维生素、胃药',
    createdAt: '2025-06-01T08:00:00Z',
  },
];

const initialPromotions: Promotion[] = [
  {
    id: 'promo_001',
    name: '维生素C买二送一',
    type: 'buy_get_free',
    medicineId: 'med_004',
    buyQuantity: 2,
    freeQuantity: 1,
    discount: 1,
    startDate: '2026-06-01',
    endDate: '2026-07-31',
    isActive: true,
    createdAt: '2025-06-01T08:00:00Z',
  },
];

function generateCheckNo(existingChecks: StockCheck[]): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `CK${year}${month}${day}`;
  const todayChecks = existingChecks.filter((c) => c.checkNo.startsWith(prefix));
  const nextNum = String(todayChecks.length + 1).padStart(3, '0');
  return `${prefix}${nextNum}`;
}

function generateOrderNo(existingOrders: OrderRecord[]): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `OR${year}${month}${day}`;
  const todayOrders = existingOrders.filter((o) => o.orderNo.startsWith(prefix));
  const nextNum = String(todayOrders.length + 1).padStart(3, '0');
  return `${prefix}${nextNum}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      medicines: initialMedicines,
      batches: initialBatches,
      suppliers: initialSuppliers,
      saleRecords: [],
      stockRecords: [],
      promotions: initialPromotions,
      stockChecks: [],
      orders: [],

      getMedicineBatches: (medicineId) => {
        return get().batches.filter((b) => b.medicineId === medicineId && b.quantity > 0);
      },

      getMedicineStock: (medicineId) => {
        const batches = get().batches.filter((b) => b.medicineId === medicineId);
        return getTotalStock(batches);
      },

      getSellableStock: (medicineId) => {
        const sellableBatches = get().getSellableBatches(medicineId);
        return getTotalStock(sellableBatches);
      },

      getMedicineCostPrice: (medicineId) => {
        const batches = get().batches.filter(
          (b) => b.medicineId === medicineId && b.quantity > 0
        );
        return getAverageCostPrice(batches);
      },

      addMedicine: (medicine, initialBatch) => {
        const now = new Date().toISOString();
        const medicineId = generateId();
        const newMedicine: Medicine = {
          ...medicine,
          id: medicineId,
          createdAt: now,
          updatedAt: now,
        };

        const newBatches: MedicineBatch[] = [];
        const newStockRecords: StockRecord[] = [];

        if (initialBatch && initialBatch.quantity > 0) {
          const batch: MedicineBatch = {
            id: generateId(),
            medicineId,
            batchNo: generateBatchNo(),
            productionDate: initialBatch.productionDate,
            expiryDate: initialBatch.expiryDate,
            quantity: initialBatch.quantity,
            costPrice: initialBatch.costPrice,
            status: 'normal',
            createdAt: now,
          };
          newBatches.push(batch);

          const stockRecord: StockRecord = {
            id: generateId(),
            medicineId,
            batchId: batch.id,
            quantity: initialBatch.quantity,
            costPrice: initialBatch.costPrice,
            type: 'in',
            operationTime: now,
            remark: '初始入库',
          };
          newStockRecords.push(stockRecord);
        }

        set((state) => ({
          medicines: [...state.medicines, newMedicine],
          batches: [...state.batches, ...newBatches],
          stockRecords: [...state.stockRecords, ...newStockRecords],
        }));
      },

      updateMedicine: (id, medicine) => {
        const now = new Date().toISOString();
        set((state) => ({
          medicines: state.medicines.map((m) =>
            m.id === id ? { ...m, ...medicine, updatedAt: now } : m
          ),
        }));
      },

      deleteMedicine: (id) => {
        set((state) => ({
          medicines: state.medicines.filter((m) => m.id !== id),
          batches: state.batches.filter((b) => b.medicineId !== id),
        }));
      },

      addSupplier: (supplier) => {
        const now = new Date().toISOString();
        const newSupplier: Supplier = {
          ...supplier,
          id: generateId(),
          createdAt: now,
        };
        set((state) => ({
          suppliers: [...state.suppliers, newSupplier],
        }));
      },

      updateSupplier: (id, supplier) => {
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === id ? { ...s, ...supplier } : s
          ),
        }));
      },

      deleteSupplier: (id) => {
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id),
        }));
      },

      addBatch: (medicineId, batchData) => {
        const now = new Date().toISOString();
        const batch: MedicineBatch = {
          id: generateId(),
          medicineId,
          batchNo: generateBatchNo(),
          productionDate: batchData.productionDate,
          expiryDate: batchData.expiryDate,
          quantity: batchData.quantity,
          costPrice: batchData.costPrice,
          status: 'normal',
          createdAt: now,
        };

        const stockRecord: StockRecord = {
          id: generateId(),
          medicineId,
          batchId: batch.id,
          quantity: batchData.quantity,
          costPrice: batchData.costPrice,
          type: 'in',
          operationTime: now,
          remark: batchData.productionDate ? `批次入库` : '入库',
        };

        set((state) => ({
          batches: [...state.batches, batch],
          stockRecords: [...state.stockRecords, stockRecord],
        }));
      },

      updateBatchStatus: (batchId, status) => {
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === batchId ? { ...b, status } : b
          ),
        }));
      },

      getSellableBatches: (medicineId) => {
        const batches = get().batches.filter(
          (b) =>
            b.medicineId === medicineId &&
            b.quantity > 0 &&
            (b.status === 'normal' || b.status === 'discount')
        );
        return sortBatchesByExpiry(batches);
      },

      addSale: (medicineId, quantity, unitPrice, promotionId) => {
        const state = get();
        const medicine = state.medicines.find((m) => m.id === medicineId);
        if (!medicine) return { success: false, message: '药品不存在' };

        const sellableBatches = state.getSellableBatches(medicineId);
        const totalStock = getTotalStock(sellableBatches);

        let actualPrice = unitPrice ?? medicine.sellPrice;
        let totalAmount = actualPrice * quantity;
        let finalPromotionId = promotionId;
        let freeQty = 0;

        if (!finalPromotionId) {
          const activePromo = state.getActivePromotion(medicineId);
          if (activePromo) {
            finalPromotionId = activePromo.id;
            const promoResult = calculatePromotionPrice(activePromo, quantity, actualPrice);
            totalAmount = promoResult.finalPrice;
            freeQty = promoResult.freeQuantity;
          }
        }

        const totalDeductQty = quantity + freeQty;

        if (totalStock < totalDeductQty) {
          return { success: false, message: `可售库存不足，当前可售${totalStock}盒` };
        }

        const now = new Date().toISOString();
        const sortedBatches = sortBatchesByExpiry(sellableBatches);

        let remainingQty = totalDeductQty;
        const usedBatches: { batchId: string; quantity: number; costPrice: number }[] = [];
        let totalCost = 0;

        for (const batch of sortedBatches) {
          if (remainingQty <= 0) break;
          const deductQty = Math.min(batch.quantity, remainingQty);
          usedBatches.push({
            batchId: batch.id,
            quantity: deductQty,
            costPrice: batch.costPrice,
          });
          totalCost += deductQty * batch.costPrice;
          remainingQty -= deductQty;
        }

        const profit = totalAmount - totalCost;

        const newSaleRecords: SaleRecord[] = usedBatches.map((ub) => {
          const qtyRatio = ub.quantity / totalDeductQty;
          return {
            id: generateId(),
            medicineId,
            batchId: ub.batchId,
            quantity: Math.round(quantity * qtyRatio * 100) / 100,
            freeQuantity: Math.round(freeQty * qtyRatio * 100) / 100,
            unitPrice: actualPrice,
            totalAmount: Math.round(totalAmount * qtyRatio * 100) / 100,
            profit: Math.round(profit * qtyRatio * 100) / 100,
            promotionId: finalPromotionId,
            saleTime: now,
          };
        });

        const newStockRecords: StockRecord[] = usedBatches.map((ub) => ({
          id: generateId(),
          medicineId,
          batchId: ub.batchId,
          quantity: -ub.quantity,
          costPrice: ub.costPrice,
          type: 'out',
          operationTime: now,
          remark: freeQty > 0 ? `销售出库（含赠送${freeQty}盒）` : '销售出库',
        }));

        const updatedBatches = state.batches.map((b) => {
          const used = usedBatches.find((ub) => ub.batchId === b.id);
          if (used) {
            return { ...b, quantity: b.quantity - used.quantity };
          }
          return b;
        });

        const finalUsedBatches = usedBatches.map((ub) => ({
          batchId: ub.batchId,
          quantity: ub.quantity,
        }));

        set((state) => ({
          batches: updatedBatches,
          saleRecords: [...state.saleRecords, ...newSaleRecords],
          stockRecords: [...state.stockRecords, ...newStockRecords],
        }));

        return { success: true, usedBatches: finalUsedBatches };
      },

      addPromotion: (promotion) => {
        const now = new Date().toISOString();
        const newPromotion: Promotion = {
          ...promotion,
          id: generateId(),
          createdAt: now,
        };
        set((state) => ({
          promotions: [...state.promotions, newPromotion],
        }));
      },

      updatePromotion: (id, promotion) => {
        set((state) => ({
          promotions: state.promotions.map((p) =>
            p.id === id ? { ...p, ...promotion } : p
          ),
        }));
      },

      deletePromotion: (id) => {
        set((state) => ({
          promotions: state.promotions.filter((p) => p.id !== id),
        }));
      },

      togglePromotionActive: (id) => {
        set((state) => ({
          promotions: state.promotions.map((p) =>
            p.id === id ? { ...p, isActive: !p.isActive } : p
          ),
        }));
      },

      getActivePromotion: (medicineId) => {
        const state = get();
        const activePromotions = state.promotions.filter(
          (p) => p.medicineId === medicineId && p.isActive
        );
        return activePromotions.find((p) => isPromotionActive(p)) || null;
      },

      getReplenishmentList: () => {
        const state = get();
        const result: {
          medicine: Medicine;
          supplier: Supplier;
          currentStock: number;
          safetyStock: number;
          suggestedQuantity: number;
        }[] = [];

        state.medicines.forEach((med) => {
          const currentStock = state.getMedicineStock(med.id);
          if (currentStock <= med.safetyStock) {
            const supplier = state.suppliers.find((s) => s.id === med.supplierId);
            if (supplier) {
              const suggested = Math.max(
                med.safetyStock * 2 - currentStock,
                med.safetyStock - currentStock + 10
              );
              result.push({
                medicine: med,
                supplier,
                currentStock,
                safetyStock: med.safetyStock,
                suggestedQuantity: suggested,
              });
            }
          }
        });

        return result.sort((a, b) => a.currentStock - b.currentStock);
      },

      createStockCheck: (data) => {
        const state = get();
        const now = new Date().toISOString();
        const checkId = generateId();
        const checkNo = generateCheckNo(state.stockChecks);

        const items: StockCheckItem[] = data.items.map((item) => {
          const batch = state.batches.find((b) => b.id === item.batchId);
          const systemQuantity = batch?.quantity || 0;
          const costPrice = batch?.costPrice || 0;
          const difference = item.actualQuantity - systemQuantity;
          return {
            id: generateId(),
            checkId,
            medicineId: item.medicineId,
            batchId: item.batchId,
            systemQuantity,
            actualQuantity: item.actualQuantity,
            difference,
            costPrice,
          };
        });

        const totalDifference = items.reduce((sum, item) => sum + item.difference, 0);
        const totalDiffAmount = items.reduce(
          (sum, item) => sum + item.difference * item.costPrice,
          0
        );

        const stockCheck: StockCheck = {
          id: checkId,
          checkNo,
          title: data.title,
          status: 'draft',
          totalDifference,
          totalDiffAmount,
          items,
          createdAt: now,
          remark: data.remark,
        };

        set((state) => ({
          stockChecks: [...state.stockChecks, stockCheck],
        }));

        return checkId;
      },

      updateStockCheck: (checkId, data) => {
        const state = get();
        const stockCheck = state.stockChecks.find((c) => c.id === checkId);
        if (!stockCheck || stockCheck.status !== 'draft') return false;

        const updatedItems = data.items
          ? data.items.map((item) => {
              const batch = state.batches.find((b) => b.id === item.batchId);
              const systemQuantity = batch?.quantity || 0;
              const costPrice = batch?.costPrice || 0;
              const difference = item.actualQuantity - systemQuantity;
              const existingItem = stockCheck.items.find(
                (i) => i.batchId === item.batchId
              );
              return {
                id: existingItem?.id || generateId(),
                checkId,
                medicineId: item.medicineId,
                batchId: item.batchId,
                systemQuantity,
                actualQuantity: item.actualQuantity,
                difference,
                costPrice,
              };
            })
          : stockCheck.items;

        const totalDifference = updatedItems.reduce(
          (sum, item) => sum + item.difference,
          0
        );
        const totalDiffAmount = updatedItems.reduce(
          (sum, item) => sum + item.difference * item.costPrice,
          0
        );

        const updatedStockChecks = state.stockChecks.map((c) =>
          c.id === checkId
            ? {
                ...c,
                title: data.title !== undefined ? data.title : c.title,
                remark: data.remark !== undefined ? data.remark : c.remark,
                items: updatedItems,
                totalDifference,
                totalDiffAmount,
              }
            : c
        );

        set((state) => ({
          stockChecks: updatedStockChecks,
        }));

        return true;
      },

      deleteStockCheck: (checkId) => {
        const state = get();
        const stockCheck = state.stockChecks.find((c) => c.id === checkId);
        if (!stockCheck || stockCheck.status !== 'draft') return false;

        set((state) => ({
          stockChecks: state.stockChecks.filter((c) => c.id !== checkId),
        }));

        return true;
      },

      confirmStockCheck: (checkId) => {
        const state = get();
        const stockCheck = state.stockChecks.find((c) => c.id === checkId);
        if (!stockCheck || stockCheck.status !== 'draft') return false;

        const now = new Date().toISOString();
        const newStockRecords: StockRecord[] = [];
        const updatedBatches = [...state.batches];

        for (const item of stockCheck.items) {
          if (item.difference === 0) continue;

          const batchIndex = updatedBatches.findIndex((b) => b.id === item.batchId);
          if (batchIndex === -1) continue;

          const batch = updatedBatches[batchIndex];
          const newQuantity = batch.quantity + item.difference;
          if (newQuantity < 0) return false;

          updatedBatches[batchIndex] = {
            ...batch,
            quantity: newQuantity,
          };

          newStockRecords.push({
            id: generateId(),
            medicineId: item.medicineId,
            batchId: item.batchId,
            quantity: item.difference,
            costPrice: item.costPrice,
            type: 'adjust',
            operationTime: now,
            remark: item.difference > 0 ? '盘盈调整' : '盘亏调整',
            checkId,
          });
        }

        const updatedStockChecks = state.stockChecks.map((c) =>
          c.id === checkId
            ? { ...c, status: 'confirmed' as StockCheckStatus, confirmedAt: now }
            : c
        );

        set((state) => ({
          batches: updatedBatches,
          stockRecords: [...state.stockRecords, ...newStockRecords],
          stockChecks: updatedStockChecks,
        }));

        return true;
      },

      getStockChecks: () => {
        return get().stockChecks;
      },

      createOrderFromReplenishment: (supplierId, items) => {
        const state = get();
        const now = new Date().toISOString();
        const orderId = generateId();
        const orderNo = generateOrderNo(state.orders);

        const orderItems: OrderItem[] = items.map((item) => ({
          id: generateId(),
          orderId,
          medicineId: item.medicineId,
          suggestedQuantity: item.quantity,
          orderedQuantity: item.quantity,
          receivedQuantity: 0,
          costPrice: item.costPrice,
        }));

        const totalQuantity = orderItems.reduce((sum, item) => sum + item.orderedQuantity, 0);
        const totalAmount = orderItems.reduce(
          (sum, item) => sum + item.orderedQuantity * item.costPrice,
          0
        );

        const order: OrderRecord = {
          id: orderId,
          orderNo,
          supplierId,
          status: 'pending',
          items: orderItems,
          totalQuantity,
          totalAmount,
          createdAt: now,
        };

        set((state) => ({
          orders: [...state.orders, order],
        }));

        return orderId;
      },

      getOrders: () => {
        return get().orders;
      },

      confirmOrderArrival: (orderId, arrivalItems) => {
        const state = get();
        const order = state.orders.find((o) => o.id === orderId);
        if (!order || order.status === 'cancelled' || order.status === 'received') {
          return { success: false };
        }

        const now = new Date().toISOString();
        const newBatches: MedicineBatch[] = [];
        const newStockRecords: StockRecord[] = [];
        const batchIds: string[] = [];

        const updatedOrderItems = order.items.map((item) => {
          const arrival = arrivalItems.find((a) => a.orderItemId === item.id);
          if (!arrival) return item;

          const newReceivedQty = item.receivedQuantity + arrival.quantity;
          if (newReceivedQty > item.orderedQuantity) {
            return item;
          }

          const batch: MedicineBatch = {
            id: generateId(),
            medicineId: item.medicineId,
            batchNo: generateBatchNo(),
            productionDate: arrival.productionDate || '',
            expiryDate: arrival.expiryDate || '',
            quantity: arrival.quantity,
            costPrice: arrival.costPrice ?? item.costPrice,
            status: 'normal',
            createdAt: now,
          };
          newBatches.push(batch);
          batchIds.push(batch.id);

          newStockRecords.push({
            id: generateId(),
            medicineId: item.medicineId,
            batchId: batch.id,
            quantity: arrival.quantity,
            costPrice: arrival.costPrice ?? item.costPrice,
            type: 'in',
            operationTime: now,
            remark: '订单到货入库',
            orderId,
          });

          return {
            ...item,
            receivedQuantity: newReceivedQty,
          };
        });

        const allReceived = updatedOrderItems.every(
          (item) => item.receivedQuantity >= item.orderedQuantity
        );
        const anyReceived = updatedOrderItems.some((item) => item.receivedQuantity > 0);

        let newStatus: OrderStatus = order.status;
        if (allReceived) {
          newStatus = 'received';
        } else if (anyReceived) {
          newStatus = 'partial';
        }

        const updatedOrder: OrderRecord = {
          ...order,
          items: updatedOrderItems,
          status: newStatus,
        };

        const updatedOrders = state.orders.map((o) =>
          o.id === orderId ? updatedOrder : o
        );

        set((state) => ({
          batches: [...state.batches, ...newBatches],
          stockRecords: [...state.stockRecords, ...newStockRecords],
          orders: updatedOrders,
        }));

        return { success: true, batchIds };
      },
    }),
    {
      name: 'pharmacy-store-v2',
    }
  )
);
