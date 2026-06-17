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
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Plus,
  FileText,
  CheckCircle2,
  Trash2,
  Eye,
  Edit3,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import type { Medicine, BatchStatus, StockCheck, StockCheckItem } from '@/types';
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

const BATCH_STATUS_OPTIONS: { value: BatchStatus; label: string; color: string }[] = [
  { value: 'normal', label: '正常', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { value: 'off_shelf', label: '已下架', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  { value: 'returning', label: '退货中', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { value: 'discount', label: '折价处理', color: 'bg-violet-50 text-violet-600 border-violet-200' },
];

const getBatchStatusInfo = (status: BatchStatus) => {
  return BATCH_STATUS_OPTIONS.find((o) => o.value === status) || BATCH_STATUS_OPTIONS[0];
};

type TabType = 'overview' | 'check' | 'records';

export function Inventory() {
  const {
    medicines,
    batches,
    stockRecords,
    promotions,
    getMedicineStock,
    getMedicineBatches,
    getSellableStock,
    addBatch,
    addSale,
    getActivePromotion,
    updateBatchStatus,
    createStockCheck,
    updateStockCheck,
    deleteStockCheck,
    confirmStockCheck,
    getStockChecks,
    getOrders,
  } = useAppStore();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedMedicines, setExpandedMedicines] = useState<Set<string>>(new Set());
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);

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

  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<StockCheck | null>(null);
  const [checkForm, setCheckForm] = useState({
    title: '',
    remark: '',
    items: [] as { medicineId: string; batchId: string; actualQuantity: string }[],
  });

  const [isViewCheckModalOpen, setIsViewCheckModalOpen] = useState(false);
  const [viewingCheck, setViewingCheck] = useState<StockCheck | null>(null);

  const [isConfirmCheckModalOpen, setIsConfirmCheckModalOpen] = useState(false);
  const [confirmingCheckId, setConfirmingCheckId] = useState<string | null>(null);

  const stockChecks = useMemo(() => {
    return [...getStockChecks()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [getStockChecks]);

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

  const allStockRecords = useMemo(() => {
    return [...stockRecords].sort(
      (a, b) => new Date(b.operationTime).getTime() - new Date(a.operationTime).getTime()
    );
  }, [stockRecords]);

  const toggleMedicineExpand = (medicineId: string) => {
    setExpandedMedicines((prev) => {
      const next = new Set(prev);
      if (next.has(medicineId)) {
        next.delete(medicineId);
      } else {
        next.add(medicineId);
      }
      return next;
    });
  };

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
      const sellableStock = getSellableStock(selectedMedicine.id);
      const promotion = getActivePromotion(selectedMedicine.id);

      let totalDeductQty = parseInt(stockOutForm.quantity);
      if (promotion?.type === 'buy_get_free') {
        const freeQty =
          Math.floor(totalDeductQty / promotion.buyQuantity) * promotion.freeQuantity;
        totalDeductQty += freeQty;
      }

      if (totalDeductQty > sellableStock) {
        toast.error(`可售库存不足，当前可售 ${sellableStock} 盒`);
        return;
      }

      const result = addSale(
        selectedMedicine.id,
        parseInt(stockOutForm.quantity),
        selectedMedicine.sellPrice,
        promotion?.id
      );

      if (!result.success) {
        toast.error(result.message || '出库失败');
        return;
      }

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

  const handleUpdateBatchStatus = (batchId: string, status: BatchStatus) => {
    updateBatchStatus(batchId, status);
    setStatusDropdownOpen(null);
    toast.success('状态更新成功');
  };

  const handleOpenNewCheckModal = () => {
    const today = new Date();
    const defaultTitle = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 盘点单`;

    const allBatches = batches.filter((b) => b.quantity > 0);
    const items = allBatches.map((b) => ({
      medicineId: b.medicineId,
      batchId: b.id,
      actualQuantity: b.quantity.toString(),
    }));

    setCheckForm({
      title: defaultTitle,
      remark: '',
      items,
    });
    setEditingCheck(null);
    setIsCheckModalOpen(true);
  };

  const handleOpenEditCheckModal = (check: StockCheck) => {
    setCheckForm({
      title: check.title,
      remark: check.remark || '',
      items: check.items.map((item) => ({
        medicineId: item.medicineId,
        batchId: item.batchId,
        actualQuantity: item.actualQuantity.toString(),
      })),
    });
    setEditingCheck(check);
    setIsCheckModalOpen(true);
  };

  const handleSaveCheckDraft = () => {
    if (!checkForm.title.trim()) {
      toast.error('请输入盘点单标题');
      return;
    }

    const validItems: {
      medicineId: string;
      batchId: string;
      actualQuantity: number;
    }[] = [];
    let hasError = false;

    for (let i = 0; i < checkForm.items.length; i++) {
      const item = checkForm.items[i];
      const raw = item.actualQuantity.trim();

      if (raw === '') {
        hasError = true;
        toast.error(`第 ${i + 1} 行实盘数量不能为空`);
        break;
      }
      if (!/^\d+$/.test(raw)) {
        hasError = true;
        toast.error(`第 ${i + 1} 行实盘数量必须是非负整数`);
        break;
      }
      const qty = parseInt(raw, 10);
      if (qty < 0) {
        hasError = true;
        toast.error(`第 ${i + 1} 行实盘数量不能为负数`);
        break;
      }
      validItems.push({
        medicineId: item.medicineId,
        batchId: item.batchId,
        actualQuantity: qty,
      });
    }
    if (hasError) return;

    if (validItems.length === 0) {
      toast.error('请至少填写一个批次的实盘数量');
      return;
    }

    if (editingCheck) {
      const ok = updateStockCheck(editingCheck.id, {
        title: checkForm.title.trim(),
        items: validItems,
        remark: checkForm.remark.trim() || undefined,
      });
      if (ok) {
        toast.success('盘点单已更新');
        setIsCheckModalOpen(false);
      } else {
        toast.error('更新失败，请重试');
      }
    } else {
      const checkId = createStockCheck({
        title: checkForm.title.trim(),
        items: validItems,
        remark: checkForm.remark.trim() || undefined,
      });
      if (checkId) {
        toast.success('盘点单已保存');
        setIsCheckModalOpen(false);
      }
    }
  };

  const handleViewCheck = (check: StockCheck) => {
    setViewingCheck(check);
    setIsViewCheckModalOpen(true);
  };

  const handleConfirmCheck = (checkId: string) => {
    setConfirmingCheckId(checkId);
    setIsConfirmCheckModalOpen(true);
  };

  const doConfirmCheck = () => {
    if (!confirmingCheckId) return;

    const result = confirmStockCheck(confirmingCheckId);
    if (result) {
      toast.success('盘点已确认');
      setIsConfirmCheckModalOpen(false);
      setConfirmingCheckId(null);
    } else {
      toast.error('确认失败，请重试');
    }
  };

  const handleDeleteCheck = (checkId: string) => {
    const ok = deleteStockCheck(checkId);
    if (ok) {
      toast.success('盘点单已删除');
    } else {
      toast.error('删除失败，已确认的盘点单不能删除');
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

  const getCheckStatusInfo = (status: string) => {
    if (status === 'draft') {
      return { label: '草稿', color: 'bg-amber-50 text-amber-600 border-amber-200' };
    }
    return { label: '已确认', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  };

  const getRecordTypeInfo = (type: string) => {
    switch (type) {
      case 'in':
        return {
          label: '批次入库',
          color: 'text-sky-600',
          bgColor: 'bg-sky-50',
          iconColor: 'text-sky-500',
        };
      case 'out':
        return {
          label: '销售出库',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          iconColor: 'text-orange-500',
        };
      case 'adjust':
        return {
          label: '盘点调整',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          iconColor: 'text-amber-500',
        };
      default:
        return {
          label: '其他',
          color: 'text-slate-600',
          bgColor: 'bg-slate-50',
          iconColor: 'text-slate-500',
        };
    }
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="border-b border-slate-100">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                库存概览
              </div>
            </button>
            <button
              onClick={() => setActiveTab('check')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'check'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                库存盘点
              </div>
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'records'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                出入库记录
              </div>
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div>
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
                  const sellableStock = getSellableStock(med.id);
                  const medBatches = getMedicineWithBatchInfo(med.id);
                  const earliestBatch = medBatches.length > 0 ? medBatches[0] : null;
                  const days = earliestBatch
                    ? getDaysUntilExpiry(earliestBatch.expiryDate)
                    : null;
                  const status = earliestBatch
                    ? getExpiryStatus(days)
                    : 'normal';
                  const activePromotion = getActivePromotion(med.id);
                  const isExpanded = expandedMedicines.has(med.id);

                  return (
                    <div
                      key={med.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <div
                        className="p-5 cursor-pointer"
                        onClick={() => toggleMedicineExpand(med.id)}
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
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-lg font-bold text-slate-800">{stock}</p>
                              <p className="text-xs text-slate-500">
                                总库存 / 安全 {med.safetyStock}
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
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5">
                          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-slate-700">批次详情</p>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500">
                                  可售库存：<span className="font-semibold text-emerald-600">{sellableStock} 盒</span>
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenStockInModal(med);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors font-medium"
                                  >
                                    <PackagePlus className="w-3.5 h-3.5" />
                                    入库
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenStockOutModal(med);
                                    }}
                                    disabled={sellableStock === 0}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                    出库
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {medBatches.map((batch) => {
                                const bDays = getDaysUntilExpiry(batch.expiryDate);
                                const bStatus = getExpiryStatus(bDays);
                                const statusInfo = getBatchStatusInfo(batch.status);
                                const isDropdownOpen = statusDropdownOpen === batch.id;

                                return (
                                  <div
                                    key={batch.id}
                                    className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                          {batch.batchNo}
                                        </span>
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}
                                        >
                                          {statusInfo.label}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm">
                                        <span className="text-slate-700">
                                          <span className="font-semibold">{batch.quantity}</span> 盒
                                        </span>
                                        <span className="text-slate-500">
                                          进价 {formatCurrency(batch.costPrice)}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                                              bStatus === 'normal'
                                                ? 'bg-emerald-500'
                                                : bStatus === 'warning'
                                                ? 'bg-amber-500'
                                                : 'bg-red-500'
                                            }`}
                                          />
                                          <span className="text-xs text-slate-500">
                                            {formatDate(batch.expiryDate)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setStatusDropdownOpen(
                                            isDropdownOpen ? null : batch.id
                                          );
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        更改状态
                                      </button>
                                      {isDropdownOpen && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-10"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setStatusDropdownOpen(null);
                                            }}
                                          />
                                          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                                            {BATCH_STATUS_OPTIONS.map((opt) => (
                                              <button
                                                key={opt.value}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUpdateBatchStatus(
                                                    batch.id,
                                                    opt.value
                                                  );
                                                }}
                                                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${
                                                  batch.status === opt.value
                                                    ? 'font-medium text-emerald-600'
                                                    : 'text-slate-600'
                                                }`}
                                              >
                                                {opt.label}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
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
        )}

        {activeTab === 'check' && (
          <div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-slate-500" />
                <h2 className="font-semibold text-slate-800">库存盘点</h2>
              </div>
              <button
                onClick={handleOpenNewCheckModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/30 rounded-xl transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                新建盘点单
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {stockChecks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500">暂无盘点单</p>
                  <p className="text-sm text-slate-400 mt-1">点击右上角按钮新建盘点单</p>
                </div>
              ) : (
                stockChecks.map((check) => {
                  const statusInfo = getCheckStatusInfo(check.status);
                  return (
                    <div
                      key={check.id}
                      className="p-5 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800">{check.title}</p>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">
                              {check.checkNo} · {check.items.length} 个批次 · 创建于 {formatDateTime(check.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p
                              className={`text-lg font-bold ${
                                check.totalDifference > 0
                                  ? 'text-emerald-600'
                                  : check.totalDifference < 0
                                  ? 'text-red-500'
                                  : 'text-slate-800'
                              }`}
                            >
                              {check.totalDifference > 0 ? '+' : ''}
                              {check.totalDifference}
                            </p>
                            <p className="text-xs text-slate-500">盈亏数量</p>
                          </div>
                          <div className="text-center">
                            <p
                              className={`text-lg font-bold ${
                                check.totalDiffAmount > 0
                                  ? 'text-emerald-600'
                                  : check.totalDiffAmount < 0
                                  ? 'text-red-500'
                                  : 'text-slate-800'
                              }`}
                            >
                              {check.totalDiffAmount > 0 ? '+' : ''}
                              {formatCurrency(check.totalDiffAmount)}
                            </p>
                            <p className="text-xs text-slate-500">盈亏金额</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {check.status === 'draft' ? (
                              <>
                                <button
                                  onClick={() => handleOpenEditCheckModal(check)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors font-medium"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  查看/编辑
                                </button>
                                <button
                                  onClick={() => handleConfirmCheck(check.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors font-medium"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  确认盘点
                                </button>
                                <button
                                  onClick={() => handleDeleteCheck(check.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  删除
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleViewCheck(check)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                              >
                                <Eye className="w-4 h-4" />
                                查看
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div>
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-slate-500" />
                <h2 className="font-semibold text-slate-800">出入库记录</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {allStockRecords.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-sm">暂无出入库记录</p>
                </div>
              ) : (
                allStockRecords.map((record) => {
                  const typeInfo = getRecordTypeInfo(record.type);
                  return (
                    <div
                      key={record.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeInfo.bgColor}`}
                        >
                          {record.type === 'in' ? (
                            <PackagePlus className={`w-4 h-4 ${typeInfo.iconColor}`} />
                          ) : record.type === 'out' ? (
                            <Minus className={`w-4 h-4 ${typeInfo.iconColor}`} />
                          ) : (
                            <ClipboardList className={`w-4 h-4 ${typeInfo.iconColor}`} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {getMedicineName(record.medicineId)}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <span className={typeInfo.color}>{typeInfo.label}</span>
                            {record.batchId && (
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                {batches.find((b) => b.id === record.batchId)?.batchNo || '-'}
                              </span>
                            )}
                            {record.checkId && (
                              <span className="text-[10px] text-amber-600 font-mono bg-amber-50 px-1.5 py-0.5 rounded">
                                关联单据：{getStockChecks().find((c) => c.id === record.checkId)?.checkNo || '-'}
                              </span>
                            )}
                            {record.orderId && (
                              <span className="text-[10px] text-sky-600 font-mono bg-sky-50 px-1.5 py-0.5 rounded">
                                关联订单：{getOrders().find((o) => o.id === record.orderId)?.orderNo || '-'}
                              </span>
                            )}
                            {record.type === 'in' && record.costPrice > 0 && (
                              <span className="text-slate-400">
                                进价 {formatCurrency(record.costPrice)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-semibold ${
                            record.quantity > 0 ? 'text-sky-600' : 'text-orange-600'
                          }`}
                        >
                          {record.quantity > 0 ? '+' : ''}
                          {record.quantity} 盒
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDateTime(record.operationTime)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
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
                <span className="text-sm text-slate-500">可售库存</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {getSellableStock(selectedMedicine.id)} 盒
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">总库存</span>
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

      <Modal
        isOpen={isCheckModalOpen}
        onClose={() => setIsCheckModalOpen(false)}
        title={editingCheck ? '编辑盘点单' : '新建盘点单'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                盘点单标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={checkForm.title}
                onChange={(e) =>
                  setCheckForm({ ...checkForm, title: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="请输入盘点单标题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                备注
              </label>
              <input
                type="text"
                value={checkForm.remark}
                onChange={(e) =>
                  setCheckForm({ ...checkForm, remark: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="可选"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                批次明细
              </label>
              <span className="text-xs text-slate-500">
                共 {checkForm.items.length} 个批次
              </span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">
                      药品名称
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">
                      批次号
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-2.5">
                      系统数量
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-2.5">
                      实盘数量
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-2.5">
                      盈亏
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {checkForm.items.map((item, index) => {
                    const medicine = medicines.find((m) => m.id === item.medicineId);
                    const batch = batches.find((b) => b.id === item.batchId);
                    const systemQty = batch?.quantity || 0;
                    const actualQty = parseInt(item.actualQuantity) || 0;
                    const diff = actualQty - systemQty;

                    return (
                      <tr key={item.batchId} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-slate-800">
                            {medicine?.name || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {batch?.batchNo || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-sm text-slate-700">{systemQty}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.actualQuantity}
                            onChange={(e) => {
                              const newItems = [...checkForm.items];
                              newItems[index] = {
                                ...newItems[index],
                                actualQuantity: e.target.value,
                              };
                              setCheckForm({ ...checkForm, items: newItems });
                            }}
                            className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className={`text-sm font-medium ${
                              diff > 0
                                ? 'text-emerald-600'
                                : diff < 0
                                ? 'text-red-500'
                                : 'text-slate-400'
                            }`}
                          >
                            {diff > 0 ? '+' : ''}
                            {diff}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCheckModalOpen(false)}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveCheckDraft}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
            >
              保存草稿
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isViewCheckModalOpen}
        onClose={() => setIsViewCheckModalOpen(false)}
        title="盘点单详情"
        size="xl"
      >
        {viewingCheck && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">盘点单号</p>
                <p className="text-sm font-semibold text-slate-800 font-mono">
                  {viewingCheck.checkNo}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">状态</p>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                    getCheckStatusInfo(viewingCheck.status).color
                  }`}
                >
                  {getCheckStatusInfo(viewingCheck.status).label}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">创建时间</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDateTime(viewingCheck.createdAt)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">标题</p>
              <p className="text-sm font-medium text-slate-800">{viewingCheck.title}</p>
            </div>

            {viewingCheck.remark && (
              <div>
                <p className="text-xs text-slate-500 mb-1">备注</p>
                <p className="text-sm text-slate-700">{viewingCheck.remark}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-center">
                <p
                  className={`text-2xl font-bold ${
                    viewingCheck.totalDifference > 0
                      ? 'text-emerald-600'
                      : viewingCheck.totalDifference < 0
                      ? 'text-red-500'
                      : 'text-slate-800'
                  }`}
                >
                  {viewingCheck.totalDifference > 0 ? '+' : ''}
                  {viewingCheck.totalDifference}
                </p>
                <p className="text-xs text-slate-500 mt-1">盈亏数量</p>
              </div>
              <div className="text-center">
                <p
                  className={`text-2xl font-bold ${
                    viewingCheck.totalDiffAmount > 0
                      ? 'text-emerald-600'
                      : viewingCheck.totalDiffAmount < 0
                      ? 'text-red-500'
                      : 'text-slate-800'
                  }`}
                >
                  {viewingCheck.totalDiffAmount > 0 ? '+' : ''}
                  {formatCurrency(viewingCheck.totalDiffAmount)}
                </p>
                <p className="text-xs text-slate-500 mt-1">盈亏金额</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                批次明细
              </label>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">
                        药品名称
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">
                        批次号
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-2.5">
                        系统数量
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-2.5">
                        实盘数量
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-2.5">
                        盈亏
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-2.5">
                        盈亏金额
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingCheck.items.map((item) => {
                      const medicine = medicines.find(
                        (m) => m.id === item.medicineId
                      );
                      const diffAmount = item.difference * item.costPrice;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <span className="text-sm text-slate-800">
                              {medicine?.name || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {batches.find((b) => b.id === item.batchId)?.batchNo || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-sm text-slate-700">
                              {item.systemQuantity}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-sm text-slate-700">
                              {item.actualQuantity}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`text-sm font-medium ${
                                item.difference > 0
                                  ? 'text-emerald-600'
                                  : item.difference < 0
                                  ? 'text-red-500'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.difference > 0 ? '+' : ''}
                              {item.difference}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`text-sm font-medium ${
                                diffAmount > 0
                                  ? 'text-emerald-600'
                                  : diffAmount < 0
                                  ? 'text-red-500'
                                  : 'text-slate-400'
                              }`}
                            >
                              {diffAmount > 0 ? '+' : ''}
                              {formatCurrency(diffAmount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsViewCheckModalOpen(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isConfirmCheckModalOpen}
        onClose={() => setIsConfirmCheckModalOpen(false)}
        title="确认盘点"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                确认盘点后将不可修改
              </p>
              <p className="text-xs text-amber-600 mt-1">
                系统将根据实盘数量自动调整库存，并生成盘点调整记录。确认后无法撤销。
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsConfirmCheckModalOpen(false)}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              取消
            </button>
            <button
              type="button"
              onClick={doConfirmCheck}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
            >
              确认盘点
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}