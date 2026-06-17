import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Medicine,
  MedicineBatch,
  Supplier,
  SaleRecord,
  StockRecord,
  Promotion,
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

  addMedicine: (
    medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>,
    initialBatch?: Omit<MedicineBatch, 'id' | 'medicineId' | 'batchNo' | 'createdAt'>
  ) => void;
  updateMedicine: (id: string, medicine: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  getMedicineBatches: (medicineId: string) => MedicineBatch[];
  getMedicineStock: (medicineId: string) => number;
  getMedicineCostPrice: (medicineId: string) => number;

  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addBatch: (
    medicineId: string,
    batchData: Omit<MedicineBatch, 'id' | 'medicineId' | 'batchNo' | 'createdAt'>
  ) => void;

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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      medicines: initialMedicines,
      batches: initialBatches,
      suppliers: initialSuppliers,
      saleRecords: [],
      stockRecords: [],
      promotions: initialPromotions,

      getMedicineBatches: (medicineId) => {
        return get().batches.filter((b) => b.medicineId === medicineId && b.quantity > 0);
      },

      getMedicineStock: (medicineId) => {
        const batches = get().batches.filter((b) => b.medicineId === medicineId);
        return getTotalStock(batches);
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

      addSale: (medicineId, quantity, unitPrice, promotionId) => {
        const state = get();
        const medicine = state.medicines.find((m) => m.id === medicineId);
        if (!medicine) return { success: false, message: '药品不存在' };

        const medicineBatches = state.batches.filter(
          (b) => b.medicineId === medicineId && b.quantity > 0
        );
        const totalStock = getTotalStock(medicineBatches);

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
          return { success: false, message: `库存不足，当前库存${totalStock}盒` };
        }

        const now = new Date().toISOString();
        const sortedBatches = sortBatchesByExpiry(medicineBatches);

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
    }),
    {
      name: 'pharmacy-store-v2',
    }
  )
);
