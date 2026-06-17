import { useState, useMemo } from 'react';
import {
  Search,
  PackagePlus,
  ShoppingCart,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  Tag,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import {
  getStockAlertStatus,
  getStockAlertStatusText,
  getStockAlertColor,
  formatCurrency,
  isPromotionActive,
  calculatePromotionPrice,
} from '@/utils';

type OperationType = 'in' | 'out' | null;

export function Inventory() {
  const {
    medicines,
    addStockIn,
    addSale,
    promotions,
    getActivePromotion,
  } = useAppStore();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'stock' | 'name'>('stock');
  const [operationType, setOperationType] = useState<OperationType>(null);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const filteredMedicines = useMemo(() => {
    let result = medicines.filter(
      (med) =>
        med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.specification.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortBy === 'stock') {
      result.sort((a, b) => a.stock - b.stock);
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [medicines, searchTerm, sortBy]);

  const selectedMedicine = useMemo(
    () => medicines.find((m) => m.id === selectedMedicineId),
    [medicines, selectedMedicineId]
  );

  const activePromotion = useMemo(() => {
    if (!selectedMedicineId) return null;
    return getActivePromotion(selectedMedicineId);
  }, [selectedMedicineId, getActivePromotion]);

  const totalValue = useMemo(() => {
    return medicines.reduce((sum, med) => sum + med.stock * med.costPrice, 0);
  }, [medicines]);

  const lowStockCount = useMemo(() => {
    return medicines.filter((med) => med.stock <= med.safetyStock).length;
  }, [medicines]);

  const openOperation = (type: OperationType, medicineId?: string) => {
    setOperationType(type);
    if (medicineId) {
      setSelectedMedicineId(medicineId);
      const med = medicines.find((m) => m.id === medicineId);
      if (med && type === 'out') {
        setUnitPrice(med.sellPrice.toString());
      } else if (med && type === 'in') {
        setUnitPrice(med.costPrice.toString());
      }
    } else {
      setSelectedMedicineId('');
      setUnitPrice('');
    }
    setQuantity('');
  };

  const closeOperation = () => {
    setOperationType(null);
    setSelectedMedicineId('');
    setQuantity('');
    setUnitPrice('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMedicineId || !quantity || parseInt(quantity) <= 0) {
      toast.error('请选择药品并输入数量');
      return;
    }

    const qty = parseInt(quantity);
    const price = unitPrice ? parseFloat(unitPrice) : undefined;

    if (operationType === 'in') {
      const costPrice = price ?? selectedMedicine?.costPrice ?? 0;
      addStockIn(selectedMedicineId, qty, costPrice);
      toast.success(`入库成功：${selectedMedicine?.name} × ${qty}`);
    } else if (operationType === 'out') {
      if (selectedMedicine && qty > selectedMedicine.stock) {
        toast.error('库存不足');
        return;
      }
      const success = addSale(selectedMedicineId, qty, price);
      if (success) {
        let msg = `销售成功：${selectedMedicine?.name} × ${qty}`;
        if (activePromotion) {
          msg += '（活动价）';
        }
        toast.success(msg);
      } else {
        toast.error('销售失败，库存不足');
        return;
      }
    }

    closeOperation();
  };

  const salePreview = useMemo(() => {
    if (operationType !== 'out' || !selectedMedicine || !quantity) return null;
    const qty = parseInt(quantity) || 0;
    const price = unitPrice ? parseFloat(unitPrice) : selectedMedicine.sellPrice;

    if (activePromotion) {
      const promoResult = calculatePromotionPrice(activePromotion, qty, price);
      return {
        originalTotal: qty * price,
        finalTotal: promoResult.finalPrice,
        freeQuantity: promoResult.freeQuantity,
        totalQuantity: promoResult.totalQuantity,
        saved: qty * price - promoResult.finalPrice,
      };
    }

    return {
      originalTotal: qty * price,
      finalTotal: qty * price,
      freeQuantity: 0,
      totalQuantity: qty,
      saved: 0,
    };
  }, [operationType, selectedMedicine, quantity, unitPrice, activePromotion]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">库存管理</h1>
          <p className="text-slate-500 mt-1">管理药品库存，进行入库和销售操作</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openOperation('in')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <PackagePlus className="w-5 h-5" />
            药品入库
          </button>
          <button
            onClick={() => openOperation('out')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
          >
            <ShoppingCart className="w-5 h-5" />
            销售出库
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">药品种类</p>
              <p className="text-2xl font-bold text-slate-800">{medicines.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">库存预警</p>
              <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-sky-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">库存总价值</p>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(totalValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索药品..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-72 pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'stock' | 'name')}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none bg-white cursor-pointer"
            >
              <option value="stock">按库存排序</option>
              <option value="name">按名称排序</option>
            </select>
          </div>
          <span className="text-sm text-slate-500">
            共 {filteredMedicines.length} 种药品
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  药品名称
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  分类
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  当前库存
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  安全库存
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  售价
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicines.map((med) => {
                const status = getStockAlertStatus(med.stock, med.safetyStock);
                return (
                  <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800 text-sm">{med.name}</p>
                      <p className="text-xs text-slate-500">{med.specification}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {med.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-lg font-bold ${
                          status === 'normal' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {med.stock}
                      </span>
                      <span className="text-sm text-slate-500 ml-1">盒</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {med.safetyStock} 盒
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStockAlertColor(
                          status
                        )}`}
                      >
                        {getStockAlertStatusText(status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-800">
                      {formatCurrency(med.sellPrice)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openOperation('in', med.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          入库
                        </button>
                        <button
                          onClick={() => openOperation('out', med.id)}
                          disabled={med.stock === 0}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          销售
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={operationType !== null}
        onClose={closeOperation}
        title={operationType === 'in' ? '药品入库' : '销售出库'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              选择药品 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMedicineId}
              onChange={(e) => {
                setSelectedMedicineId(e.target.value);
                const med = medicines.find((m) => m.id === e.target.value);
                if (med) {
                  if (operationType === 'out') {
                    setUnitPrice(med.sellPrice.toString());
                  } else {
                    setUnitPrice(med.costPrice.toString());
                  }
                }
              }}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="">请选择药品</option>
              {medicines.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name} - {med.specification}（库存: {med.stock}）
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              数量（盒） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="请输入数量"
            />
            {operationType === 'out' && selectedMedicine && (
              <p className="text-xs text-slate-500 mt-1">
                当前库存：{selectedMedicine.stock} 盒
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {operationType === 'in' ? '进价' : '售价'}（元）
            </label>
            <input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="0.00"
            />
          </div>

          {operationType === 'out' && activePromotion && salePreview && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  {activePromotion.name}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">原价：</span>
                  <span className="text-slate-500 line-through">
                    {formatCurrency(salePreview.originalTotal)}
                  </span>
                </div>
                {salePreview.freeQuantity > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">赠送：</span>
                    <span className="text-emerald-600 font-medium">
                      +{salePreview.freeQuantity} 盒
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">实付：</span>
                  <span className="text-amber-600 font-bold">
                    {formatCurrency(salePreview.finalTotal)}
                  </span>
                </div>
                {salePreview.saved > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">节省：</span>
                    <span className="text-emerald-600">
                      {formatCurrency(salePreview.saved)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {salePreview && operationType === 'out' && !activePromotion && (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">应收金额：</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(salePreview.finalTotal)}
                </span>
              </div>
            </div>
          )}

          {operationType === 'in' && quantity && unitPrice && (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">入库总成本：</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(parseInt(quantity) * parseFloat(unitPrice || '0'))}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeOperation}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-white rounded-xl font-medium text-sm transition-all ${
                operationType === 'in'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:shadow-lg hover:shadow-sky-500/30'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30'
              }`}
            >
              {operationType === 'in' ? '确认入库' : '确认销售'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
