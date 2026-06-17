import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Medicine,
  Supplier,
  SaleRecord,
  StockRecord,
  Promotion,
} from '@/types';
import { generateId, isPromotionActive, calculatePromotionPrice } from '@/utils';

interface AppState {
  medicines: Medicine[];
  suppliers: Supplier[];
  saleRecords: SaleRecord[];
  stockRecords: StockRecord[];
  promotions: Promotion[];

  addMedicine: (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMedicine: (id: string, medicine: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;

  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addStockIn: (medicineId: string, quantity: number, costPrice: number, remark?: string) => void;
  addSale: (medicineId: string, quantity: number, unitPrice?: number, promotionId?: string) => boolean;

  addPromotion: (promotion: Omit<Promotion, 'id' | 'createdAt'>) => void;
  updatePromotion: (id: string, promotion: Partial<Promotion>) => void;
  deletePromotion: (id: string) => void;
  togglePromotionActive: (id: string) => void;

  getActivePromotion: (medicineId: string) => Promotion | null;
}

const initialMedicines: Medicine[] = [
  {
    id: 'med_001',
    name: '感冒灵颗粒',
    category: '感冒药',
    specification: '10g*9袋',
    costPrice: 8.5,
    sellPrice: 15.8,
    stock: 45,
    safetyStock: 20,
    productionDate: '2025-03-15',
    expiryDate: '2026-09-14',
    supplierId: 'sup_001',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_002',
    name: '硝苯地平缓释片',
    category: '降压药',
    specification: '10mg*30片',
    costPrice: 12.0,
    sellPrice: 22.5,
    stock: 8,
    safetyStock: 15,
    productionDate: '2025-01-20',
    expiryDate: '2026-07-19',
    supplierId: 'sup_002',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_003',
    name: '阿莫西林胶囊',
    category: '消炎药',
    specification: '0.25g*24粒',
    costPrice: 6.8,
    sellPrice: 12.0,
    stock: 3,
    safetyStock: 10,
    productionDate: '2025-04-10',
    expiryDate: '2026-06-25',
    supplierId: 'sup_001',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_004',
    name: '维生素C片',
    category: '维生素',
    specification: '100mg*100片',
    costPrice: 5.0,
    sellPrice: 9.9,
    stock: 120,
    safetyStock: 30,
    productionDate: '2025-02-28',
    expiryDate: '2027-02-27',
    supplierId: 'sup_003',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_005',
    name: '布洛芬缓释胶囊',
    category: '止痛药',
    specification: '0.3g*20粒',
    costPrice: 10.5,
    sellPrice: 18.8,
    stock: 25,
    safetyStock: 15,
    productionDate: '2025-05-01',
    expiryDate: '2026-12-30',
    supplierId: 'sup_002',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'med_006',
    name: '奥美拉唑肠溶胶囊',
    category: '胃药',
    specification: '20mg*14粒',
    costPrice: 15.0,
    sellPrice: 28.0,
    stock: 50,
    safetyStock: 20,
    productionDate: '2025-03-08',
    expiryDate: '2026-08-07',
    supplierId: 'sup_003',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
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

const initialSales: SaleRecord[] = [];

const initialStockRecords: StockRecord[] = [];

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
      suppliers: initialSuppliers,
      saleRecords: initialSales,
      stockRecords: initialStockRecords,
      promotions: initialPromotions,

      addMedicine: (medicine) => {
        const now = new Date().toISOString();
        const newMedicine: Medicine = {
          ...medicine,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          medicines: [...state.medicines, newMedicine],
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

      addStockIn: (medicineId, quantity, costPrice, remark) => {
        const now = new Date().toISOString();
        const stockRecord: StockRecord = {
          id: generateId(),
          medicineId,
          quantity,
          costPrice,
          type: 'in',
          operationTime: now,
          remark,
        };

        set((state) => {
          const medicine = state.medicines.find((m) => m.id === medicineId);
          if (!medicine) return state;

          const updatedMedicines = state.medicines.map((m) =>
            m.id === medicineId
              ? {
                  ...m,
                  stock: m.stock + quantity,
                  costPrice: costPrice,
                  updatedAt: now,
                }
              : m
          );

          return {
            medicines: updatedMedicines,
            stockRecords: [...state.stockRecords, stockRecord],
          };
        });
      },

      addSale: (medicineId, quantity, unitPrice, promotionId) => {
        const state = get();
        const medicine = state.medicines.find((m) => m.id === medicineId);
        if (!medicine || medicine.stock < quantity) return false;

        const now = new Date().toISOString();
        const price = unitPrice ?? medicine.sellPrice;
        let totalAmount = price * quantity;
        let profit = (price - medicine.costPrice) * quantity;
        let finalPromotionId = promotionId;

        if (!finalPromotionId) {
          const activePromo = get().getActivePromotion(medicineId);
          if (activePromo) {
            finalPromotionId = activePromo.id;
            const promoResult = calculatePromotionPrice(activePromo, quantity, price);
            totalAmount = promoResult.finalPrice;
            profit = promoResult.finalPrice - medicine.costPrice * quantity;
          }
        }

        const saleRecord: SaleRecord = {
          id: generateId(),
          medicineId,
          quantity,
          unitPrice: price,
          totalAmount,
          profit,
          promotionId: finalPromotionId,
          saleTime: now,
        };

        const stockRecord: StockRecord = {
          id: generateId(),
          medicineId,
          quantity: -quantity,
          costPrice: medicine.costPrice,
          type: 'out',
          operationTime: now,
          remark: '销售出库',
        };

        set((state) => ({
          saleRecords: [...state.saleRecords, saleRecord],
          stockRecords: [...state.stockRecords, stockRecord],
          medicines: state.medicines.map((m) =>
            m.id === medicineId
              ? { ...m, stock: m.stock - quantity, updatedAt: now }
              : m
          ),
        }));

        return true;
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
    }),
    {
      name: 'pharmacy-store',
    }
  )
);
