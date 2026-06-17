import { useState, useMemo } from 'react';
import {
  Package,
  Search,
  TrendingDown,
  CalendarClock,
  Layers,
  Pill,
  PackagePlus,
  Minus,
  Filter,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import type { Medicine } from '@/types';
import {
  getDaysUntilExpiry,
  getExpiryStatus,
  getExpiryStatusText,
  getExpiryStatusColor,
  formatCurrency,
  formatDate,
  formatDateTime,
  sortBatchesByExpiry,
  isValidDate,
} from '@/utils';

export function Inventory() {
  const {
    medicines,
    batches,
    stockRecords,
    promotions,
    getMedicineStock,
    getMedicineBatches,
    addBatch,
    addSale,
    getActivePromotion,
  } = useAppStore();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  const [stockInForm, setStockInForm] = useState({
    productionDate: '',
    expiryDate: '',
    quantity: '',
    costPrice: '',
  });

  const [stockOutForm, setStockOutForm] = useState({
    quantity: '',
  });

  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const matchSearch =
        med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.specification.toLowerCase().includes(searchTerm.toLowerCase());

      const stock = getMedicineStock(med.id);
      const medBatches = getMedicineBatches(med.id).filter((b) => b.quantity > 0);
      const earliestBatch = medBatches.length > 0 ? medBatches[0] : null;
      const days = earliestBatch
        ? getDaysUntilExpiry(earliestBatch.expiryDate)
        : null;

      let matchStatus = true;
      if (filterStatus === 'low') {
        matchStatus = stock <= med.safetyStock;
      } else if (filterStatus === 'warning') {
        matchStatus = days !== null && days <= 30 && days > 0;
      } else if (filterStatus === 'expired') {
        matchStatus = days !== null && days <= 0;
      }

      return matchSearch && matchStatus;
    });
  }, [medicines, searchTerm, filterStatus, batches]);

  const recentStockRecords = useMemo(() => {
    return [...stockRecords]
      .sort((a, b) => new Date(b.operationTime).getTime() - new Date(a.operationTime).getTime())
      .slice(0, 15);
  }, [stockRecords]);

  const handleOpenStockInModal = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setStockInForm({
      productionDate: '',
      expiryDate: '',
      quantity: '',
      costPrice: '',
    });
    setIsStockInModalOpen(true);
  };

  const handleOpenStockOutModal = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setStockOutForm({ quantity: '' });
    setIsStockOutModalOpen(true);
  };

  const handleStockIn = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidDate(stockInForm.productionDate)) {
      toast.error('请选择生产日期');
      return;
    }
    if (!isValidDate(stockInForm.expiryDate)) {
      toast.error('请选择有效期');
      return;
    }
    if (!stockInForm.quantity || parseInt(stockInForm.quantity) <= 0) {
      toast.error('请输入入库数量');
      return;
    }
    if (!stockInForm.costPrice || parseFloat(stockInForm.costPrice) <= 0) {
      toast.error('请输入进价');
      return;
    }

    if (
      new Date(stockInForm.expiryDate) <=
      new Date(stockInForm.productionDate)
    ) {
      toast.error('有效期必须晚于生产日期');
      return;
    }

    if (selectedMedicine) {
      addBatch(selectedMedicine.id, {
        productionDate: stockInForm.productionDate,
        expiryDate: stockInForm.expiryDate,
        quantity: parseInt(stockInForm.quantity),
        costPrice: parseFloat(stockInForm.costPrice),
      });
      toast.success('入库成功');
      setIsStockInModalOpen(false);
    }
  };

  const handleStockOut = (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockOutForm.quantity || parseInt(stockOutForm.quantity) <= 0) {
      toast.error('请输入出库数量');
      return;
    }

    if (selectedMedicine) {
      const stock = getMedicineStock(selectedMedicine.id);
      if (parseInt(stockOutForm.quantity) > stock) {
        toast.error(`库存不足，当前库存 ${stock} 盒`);
        return;
      }

      const promotion = getActivePromotion(selectedMedicine.id);
      addSale(
        selectedMedicine.id,
        parseInt(stockOutForm.quantity),
        selectedMedicine.sellPrice,
        promotion?.id
      );

      if (promotion) {
        const freeQty =
          promotion.type === 'buy_get_free'
            ? Math.floor(parseInt(stockOutForm.quantity) / promotion.buyQuantity) *
              promotion.freeQuantity
            : 0;
        toast.success(
          `出库成功${
            freeQty > 0 ? `，含买赠活动赠送 ${freeQty} 盒` : ''
          }`
        );
      } else {
        toast.success('出库成功');
      }
      setIsStockOutModalOpen(false);
    }
  };

  const getStockStatusColor = (medicine: Medicine) => {
    const stock = getMedicineStock(medicine.id);
    if (stock === 0) return 'bg-red-500';
    if (stock <= medicine.safetyStock) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getMedicineName = (id: string) =>
    medicines.find((m) => m.id === id)?.name || '-';

  const getMedicineWithBatchInfo = (medicineId: string) => {
    const medBatches = sortBatchesByExpiry(
      getMedicineBatches(medicineId).filter((b) => b.quantity > 0)
    );
    return medBatches;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">库存管理</h1>
          <p className="text-slate-500 mt-1">
            管理药品库存入库出库，按批次先进先出
          </p>
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
            <div className="relative">
              <Filter className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none bg-white cursor-pointer"
              >
                <option value="all">全部状态</option>
                <option value="low">库存不足</option>
                <option value="warning">临期提醒</option>
                <option value="expired">已过期</option>
              </select>
            </div>
          </div>
          <span className="text-sm text-slate-500">
            共 {filteredMedicines.length} 种药品
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredMedicines.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">暂无药品数据</p>
            </div>
          ) : (
            filteredMedicines.map((med) => {
              const stock = getMedicineStock(med.id);
              const medBatches = getMedicineWithBatchInfo(med.id);
              const earliestBatch = medBatches.length > 0 ? medBatches[0] : null;
              const days = earliestBatch
                ? getDaysUntilExpiry(earliestBatch.expiryDate)
                : null;
              const status = earliestBatch
                ? getExpiryStatus(days)
                : 'normal';
              const activePromotion = getActivePromotion(med.id);

              return (
                <div
                  key={med.id}
                  className="p-5 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="relative">
                        <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center">
                          <Pill className="w-5 h-5 text-sky-500" />
                        </div>
                        <span
                          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStockStatusColor(
                            med
                          )}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800">{med.name}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {med.category}
                          </span>
                          {medBatches.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-600">
                              <Layers className="w-3 h-3" />
                              {medBatches.length} 批次
                            </span>
                          )}
                          {activePromotion && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-600">
                              <Tag className="w-3 h-3" />
                              活动中
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {med.specification}
                        </p>
                        {medBatches.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {medBatches.slice(0, 3).map((batch) => {
                              const bDays = getDaysUntilExpiry(batch.expiryDate);
                              const bStatus = getExpiryStatus(bDays);
                              return (
                                <div
                                  key={batch.id}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md"
                                >
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {batch.batchNo}
                                  </span>
                                  <span className="text-xs text-slate-700 font-medium">
                                    {batch.quantity}盒
                                  </span>
                                  <span
                                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                                      bStatus === 'normal'
                                        ? 'bg-emerald-500'
                                        : bStatus === 'warning'
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                    }`}
                                  />
                                  <span className="text-[10px] text-slate-500">
                                    {formatDate(batch.expiryDate)}
                                  </span>
                                </div>
                              );
                            })}
                            {medBatches.length > 3 && (
                              <span className="text-xs text-slate-400 px-2 py-1">
                                +{medBatches.length - 3} 更多
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-800">{stock}</p>
                        <p className="text-xs text-slate-500">
                          库存 / 安全 {med.safetyStock}
                        </p>
                      </div>
                      <div className="text-center min-w-[100px]">
                        {earliestBatch ? (
                          <>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getExpiryStatusColor(
                                status
                              )}`}
                            >
                              {getExpiryStatusText(status)}
                            </span>
                            <p className="text-xs text-slate-500 mt-1">
                              {days !== null
                                ? days > 0
                                  ? `最早${days}天后过期`
                                  : `已过期${Math.abs(days)}天`
                                : '-'}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">暂无库存</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleOpenStockInModal(med)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors font-medium"
                      >
                        <PackagePlus className="w-4 h-4" />
                        入库
                      </button>
                      <button
                        onClick={() => handleOpenStockOutModal(med)}
                        disabled={stock === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                        出库
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">最近出入库记录</h2>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {recentStockRecords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">暂无出入库记录</p>
            </div>
          ) : (
            recentStockRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      record.type === 'in'
                        ? 'bg-sky-50'
                        : 'bg-orange-50'
                    }`}
                  >
                    {record.type === 'in' ? (
                      <PackagePlus className="w-4 h-4 text-sky-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">
                      {getMedicineName(record.medicineId)}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      {record.type === 'in' ? (
                        <span>批次入库</span>
                      ) : (
                        <span>
                          销售出库
                          {record.batchId && (
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              {record.batchId.slice(-6)}
                            </span>
                          )}
                        </span>
                      )}
                      {record.quantity > 0 && (
                        <span className="text-slate-400">
                          进价 {formatCurrency(record.costPrice || 0)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`font-semibold ${
                      record.type === 'in'
                        ? 'text-sky-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {record.type === 'in' ? '+' : '-'}
                    {record.quantity} 盒
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDateTime(record.operationTime)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isStockInModalOpen}
        onClose={() => setIsStockInModalOpen(false)}
        title={
          selectedMedicine
            ? `${selectedMedicine.name} - 入库`
            : '入库'
        }
        size="md"
      >
        <form onSubmit={handleStockIn} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                生产日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={stockInForm.productionDate}
                onChange={(e) =>
                  setStockInForm({
                    ...stockInForm,
                    productionDate: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                有效期至 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={stockInForm.expiryDate}
                onChange={(e) =>
                  setStockInForm({
                    ...stockInForm,
                    expiryDate: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                入库数量（盒） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={stockInForm.quantity}
                onChange={(e) =>
                  setStockInForm({ ...stockInForm, quantity: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                进价（元/盒） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={stockInForm.costPrice}
                onChange={(e) =>
                  setStockInForm({ ...stockInForm, costPrice: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-sky-50 rounded-xl">
            <CalendarClock className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-sky-700">
              每个批次都会单独记录生产日期、有效期和进价。销售时系统会自动优先扣除快过期的批次。
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsStockInModalOpen(false)}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all font-medium text-sm"
            >
              确认入库
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isStockOutModalOpen}
        onClose={() => setIsStockOutModalOpen(false)}
        title={
          selectedMedicine
            ? `${selectedMedicine.name} - 出库`
            : '出库'
        }
        size="md"
      >
        <form onSubmit={handleStockOut} className="space-y-4">
          {selectedMedicine && (
            <div className="p-4 bg-slate-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">当前库存</span>
                <span className="text-sm font-semibold text-slate-800">
                  {getMedicineStock(selectedMedicine.id)} 盒
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">售价</span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatCurrency(selectedMedicine.sellPrice)} / 盒
                </span>
              </div>
              {getActivePromotion(selectedMedicine.id) && (
                <div className="flex items-start gap-2 pt-2 border-t border-slate-200">
                  <AlertTriangle className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-violet-700">
                      进行中促销: {getActivePromotion(selectedMedicine.id)?.name}
                    </p>
                    <p className="text-violet-600 mt-0.5">
                      {getActivePromotion(selectedMedicine.id)?.type ===
                      'buy_get_free'
                        ? `买${
                            getActivePromotion(selectedMedicine.id)?.buyQuantity
                          }送${
                            getActivePromotion(selectedMedicine.id)?.freeQuantity
                          }（赠送数量也会扣库存）`
                        : `${
                            getActivePromotion(selectedMedicine.id)?.discount
                          }折优惠`}
                    </p>
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  出库将按批次有效期从早到晚依次扣除（先进先出）
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              出库数量（盒） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={stockOutForm.quantity}
              onChange={(e) =>
                setStockOutForm({ ...stockOutForm, quantity: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              placeholder="请输入出库数量"
            />
          </div>

          {stockOutForm.quantity &&
            selectedMedicine &&
            getActivePromotion(selectedMedicine.id)?.type === 'buy_get_free' && (
              <div className="p-3 bg-violet-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-violet-600">收款数量</span>
                  <span className="text-sm font-semibold text-violet-700">
                    {stockOutForm.quantity} 盒
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-violet-600">赠送数量</span>
                  <span className="text-sm font-semibold text-violet-700">
                    +
                    {Math.floor(
                      parseInt(stockOutForm.quantity || '0') /
                        (getActivePromotion(selectedMedicine.id)?.buyQuantity || 1)
                    ) *
                      (getActivePromotion(selectedMedicine.id)?.freeQuantity || 0)}{' '}
                    盒
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-violet-200">
                  <span className="text-sm font-medium text-violet-700">
                    共扣库存
                  </span>
                  <span className="text-lg font-bold text-violet-800">
                    {parseInt(stockOutForm.quantity || '0') +
                      Math.floor(
                        parseInt(stockOutForm.quantity || '0') /
                          (getActivePromotion(selectedMedicine.id)?.buyQuantity || 1)
                      ) *
                        (getActivePromotion(selectedMedicine.id)?.freeQuantity || 0)}{' '}
                    盒
                  </span>
                </div>
              </div>
            )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsStockOutModalOpen(false)}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium text-sm"
            >
              确认出库
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
