import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  Pill,
  PackagePlus,
  Calendar,
  CalendarClock,
  Layers,
  MoreHorizontal,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { MEDICINE_CATEGORIES } from '@/types';
import type { Medicine, MedicineBatch, BatchStatus } from '@/types';
import {
  getDaysUntilExpiry,
  getExpiryStatus,
  getExpiryStatusText,
  getExpiryStatusColor,
  formatCurrency,
  formatDate,
  sortBatchesByExpiry,
  isValidDate,
} from '@/utils';

export function Medicines() {
  const {
    medicines,
    suppliers,
    batches,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    getMedicineStock,
    getMedicineCostPrice,
    addBatch,
    updateBatchStatus,
  } = useAppStore();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchModalMedicine, setBatchModalMedicine] = useState<Medicine | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [expandedMedicine, setExpandedMedicine] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: MEDICINE_CATEGORIES[0],
    specification: '',
    sellPrice: '',
    safetyStock: '10',
    supplierId: '',
  });

  const [batchFormData, setBatchFormData] = useState({
    productionDate: '',
    expiryDate: '',
    quantity: '',
    costPrice: '',
  });

  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const matchSearch =
        med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.specification.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || med.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [medicines, searchTerm, categoryFilter]);

  const handleOpenModal = (medicine?: Medicine) => {
    if (medicine) {
      setEditingMedicine(medicine);
      setFormData({
        name: medicine.name,
        category: medicine.category,
        specification: medicine.specification,
        sellPrice: medicine.sellPrice.toString(),
        safetyStock: medicine.safetyStock.toString(),
        supplierId: medicine.supplierId,
      });
    } else {
      setEditingMedicine(null);
      setFormData({
        name: '',
        category: MEDICINE_CATEGORIES[0],
        specification: '',
        sellPrice: '',
        safetyStock: '10',
        supplierId: suppliers[0]?.id || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenBatchModal = (medicine: Medicine) => {
    setBatchModalMedicine(medicine);
    setBatchFormData({
      productionDate: '',
      expiryDate: '',
      quantity: '',
      costPrice: getMedicineCostPrice(medicine.id).toString(),
    });
    setIsBatchModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMedicine(null);
  };

  const handleCloseBatchModal = () => {
    setIsBatchModalOpen(false);
    setBatchModalMedicine(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.sellPrice) {
      toast.error('请填写必填项');
      return;
    }

    const medicineData = {
      name: formData.name,
      category: formData.category,
      specification: formData.specification,
      sellPrice: parseFloat(formData.sellPrice),
      safetyStock: parseInt(formData.safetyStock) || 10,
      supplierId: formData.supplierId,
    };

    if (editingMedicine) {
      updateMedicine(editingMedicine.id, medicineData);
      toast.success('药品信息已更新');
    } else {
      addMedicine(medicineData);
      toast.success('药品添加成功，请在列表中添加批次入库');
    }

    handleCloseModal();
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidDate(batchFormData.productionDate)) {
      toast.error('请选择生产日期');
      return;
    }
    if (!isValidDate(batchFormData.expiryDate)) {
      toast.error('请选择有效期');
      return;
    }
    if (!batchFormData.quantity || parseInt(batchFormData.quantity) <= 0) {
      toast.error('请输入入库数量');
      return;
    }
    if (!batchFormData.costPrice || parseFloat(batchFormData.costPrice) <= 0) {
      toast.error('请输入进价');
      return;
    }

    if (new Date(batchFormData.expiryDate) <= new Date(batchFormData.productionDate)) {
      toast.error('有效期必须晚于生产日期');
      return;
    }

    if (batchModalMedicine) {
      addBatch(batchModalMedicine.id, {
        productionDate: batchFormData.productionDate,
        expiryDate: batchFormData.expiryDate,
        quantity: parseInt(batchFormData.quantity),
        costPrice: parseFloat(batchFormData.costPrice),
      });
      toast.success('入库成功');
      handleCloseBatchModal();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个药品吗？所有批次数据都会被删除。')) {
      deleteMedicine(id);
      toast.success('药品已删除');
    }
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find((s) => s.id === supplierId)?.name || '-';
  };

  const getMedicineBatches = (medicineId: string): MedicineBatch[] => {
    return sortBatchesByExpiry(batches.filter((b) => b.medicineId === medicineId));
  };

  const getBatchStatusText = (status: BatchStatus): string => {
    const map: Record<BatchStatus, string> = {
      normal: '正常',
      off_shelf: '已下架',
      returning: '退货中',
      discount: '折价处理',
    };
    return map[status];
  };

  const getBatchStatusColor = (status: BatchStatus): string => {
    const map: Record<BatchStatus, string> = {
      normal: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      off_shelf: 'bg-slate-100 text-slate-500 border-slate-200',
      returning: 'bg-amber-50 text-amber-600 border-amber-200',
      discount: 'bg-purple-50 text-purple-600 border-purple-200',
    };
    return map[status];
  };

  const [statusMenuBatch, setStatusMenuBatch] = useState<string | null>(null);

  const handleUpdateBatchStatus = (batchId: string, status: BatchStatus) => {
    updateBatchStatus(batchId, status);
    setStatusMenuBatch(null);
    toast.success('批次状态已更新');
  };

  const getEarliestExpiry = (medicineId: string) => {
    const medBatches = batches.filter(
      (b) => b.medicineId === medicineId && b.quantity > 0
    );
    if (medBatches.length === 0) return null;
    const sorted = sortBatchesByExpiry(medBatches);
    return sorted[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">药品管理</h1>
          <p className="text-slate-500 mt-1">
            管理所有药品和批次，共 {medicines.length} 种药品
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
        >
          <Plus className="w-5 h-5" />
          添加药品
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索药品名称、规格..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-72 pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none bg-white cursor-pointer"
              >
                <option value="all">全部分类</option>
                {MEDICINE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
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
                <Pill className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">暂无药品数据</p>
            </div>
          ) : (
            filteredMedicines.map((med) => {
              const stock = getMedicineStock(med.id);
              const costPrice = getMedicineCostPrice(med.id);
              const earliestBatch = getEarliestExpiry(med.id);
              const days = earliestBatch
                ? getDaysUntilExpiry(earliestBatch.expiryDate)
                : null;
              const status = earliestBatch
                ? getExpiryStatus(days)
                : 'normal';
              const isExpanded = expandedMedicine === med.id;
              const medBatches = getMedicineBatches(med.id);

              return (
                <div key={med.id}>
                  <div
                    className="p-5 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedMedicine(isExpanded ? null : med.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Pill className="w-5 h-5 text-emerald-500" />
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
                                {medBatches.filter((b) => b.quantity > 0).length} 个批次
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {med.specification} · 供货商: {getSupplierName(med.supplierId)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-lg font-bold text-slate-800">{stock}</p>
                          <p className="text-xs text-slate-500">库存</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-800">
                            {formatCurrency(costPrice)}
                          </p>
                          <p className="text-xs text-slate-500">均进价</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-800">
                            {formatCurrency(med.sellPrice)}
                          </p>
                          <p className="text-xs text-slate-500">售价</p>
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
                            <span className="text-xs text-slate-400">暂无批次</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenBatchModal(med);
                          }}
                          className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="入库"
                        >
                          <PackagePlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(med);
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(med.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && medBatches.length > 0 && (
                    <div className="bg-slate-50 px-5 pb-4">
                      <div className="ml-14">
                        <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          批次详情（按有效期优先排序，先进先出）
                        </p>
                        <div className="grid gap-2">
                          {medBatches.map((batch) => (
                            <div
                              key={batch.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                batch.quantity === 0
                                  ? 'bg-slate-100 border-slate-200 opacity-60'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                  {batch.batchNo}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getBatchStatusColor(
                                    batch.status
                                  )}`}
                                >
                                  {getBatchStatusText(batch.status)}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-slate-600">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  生产: {formatDate(batch.productionDate)}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-600">
                                  <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                                  有效期: {formatDate(batch.expiryDate)}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <span className="text-sm font-medium text-slate-700">
                                    {batch.quantity} 盒
                                  </span>
                                  <span className="text-xs text-slate-400 ml-2">
                                    进价 {formatCurrency(batch.costPrice)}
                                  </span>
                                </div>
                                {batch.quantity > 0 && (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getExpiryStatusColor(
                                      getExpiryStatus(
                                        getDaysUntilExpiry(batch.expiryDate)
                                      )
                                    )}`}
                                  >
                                    {getExpiryStatusText(
                                      getExpiryStatus(
                                        getDaysUntilExpiry(batch.expiryDate)
                                      )
                                    )}
                                  </span>
                                )}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStatusMenuBatch(
                                        statusMenuBatch === batch.id
                                          ? null
                                          : batch.id
                                      );
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {statusMenuBatch === batch.id && (
                                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[120px]">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateBatchStatus(
                                            batch.id,
                                            'normal'
                                          );
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                                      >
                                        设为正常
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateBatchStatus(
                                            batch.id,
                                            'discount'
                                          );
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-purple-600 hover:bg-purple-50"
                                      >
                                        折价处理
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateBatchStatus(
                                            batch.id,
                                            'returning'
                                          );
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-amber-600 hover:bg-amber-50"
                                      >
                                        退货中
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateBatchStatus(
                                            batch.id,
                                            'off_shelf'
                                          );
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
                                      >
                                        已下架
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMedicine ? '编辑药品' : '添加药品'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              药品名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="请输入药品名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                分类
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                {MEDICINE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                规格
              </label>
              <input
                type="text"
                value={formData.specification}
                onChange={(e) =>
                  setFormData({ ...formData, specification: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="如：0.5g*24片"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                售价（元） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sellPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sellPrice: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                安全库存（盒）
              </label>
              <input
                type="number"
                value={formData.safetyStock}
                onChange={(e) =>
                  setFormData({ ...formData, safetyStock: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              供货商
            </label>
            <select
              value={formData.supplierId}
              onChange={(e) =>
                setFormData({ ...formData, supplierId: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {!editingMedicine && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
              <p className="text-xs text-sky-700">
                💡 添加药品后，点击列表中的「入库」按钮按批次录入生产日期、有效期和数量。
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
            >
              {editingMedicine ? '保存修改' : '添加药品'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBatchModalOpen}
        onClose={handleCloseBatchModal}
        title={
          batchModalMedicine
            ? `${batchModalMedicine.name} - 批次入库`
            : '批次入库'
        }
        size="md"
      >
        <form onSubmit={handleBatchSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                生产日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={batchFormData.productionDate}
                onChange={(e) =>
                  setBatchFormData({
                    ...batchFormData,
                    productionDate: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                有效期至 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={batchFormData.expiryDate}
                onChange={(e) =>
                  setBatchFormData({
                    ...batchFormData,
                    expiryDate: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
                value={batchFormData.quantity}
                onChange={(e) =>
                  setBatchFormData({ ...batchFormData, quantity: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
                value={batchFormData.costPrice}
                onChange={(e) =>
                  setBatchFormData({ ...batchFormData, costPrice: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              ⚠️ 生产日期和有效期必须准确填写，系统将据此计算过期预警。
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseBatchModal}
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
    </div>
  );
}
