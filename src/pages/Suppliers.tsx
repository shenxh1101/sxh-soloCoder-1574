import { useState, useMemo } from 'react';
import {
  Plus,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  Building2,
  FileText,
  Download,
  Pill,
  Package,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  ClipboardList,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import type { Supplier, OrderRecord, OrderStatus } from '@/types';
import { formatCurrency, formatDateTime, isValidDate } from '@/utils';

type TabType = 'suppliers' | 'orders';

const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待到货', color: 'text-sky-600 bg-sky-50 border-sky-200' },
  partial: { label: '部分到货', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  received: { label: '已完成', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelled: { label: '已取消', color: 'text-slate-500 bg-slate-100 border-slate-200' },
};

export function Suppliers() {
  const {
    suppliers,
    medicines,
    getReplenishmentList,
    getMedicineStock,
    getMedicineCostPrice,
    getOrders,
    createOrderFromReplenishment,
    confirmOrderArrival,
  } = useAppStore();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('suppliers');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    contactPerson: '',
    mainCategory: '',
  });

  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<OrderRecord | null>(null);

  const [isArrivalModalOpen, setIsArrivalModalOpen] = useState(false);
  const [arrivalOrder, setArrivalOrder] = useState<OrderRecord | null>(null);
  const [arrivalItems, setArrivalItems] = useState<
    {
      orderItemId: string;
      quantity: string;
      productionDate: string;
      expiryDate: string;
      costPrice: string;
    }[]
  >([]);

  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [createOrderSupplier, setCreateOrderSupplier] = useState<Supplier | null>(null);
  const [createOrderItems, setCreateOrderItems] = useState<
    { medicineId: string; quantity: string; costPrice: string }[]
  >([]);

  const replenishmentList = getReplenishmentList();
  const orders = useMemo(() => {
    return [...getOrders()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [getOrders]);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        contactPerson: supplier.contactPerson,
        mainCategory: supplier.mainCategory,
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        phone: '',
        address: '',
        contactPerson: '',
        mainCategory: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('请填写供货商名称');
      return;
    }

    if (editingSupplier) {
      useAppStore.getState().updateSupplier(editingSupplier.id, formData);
      toast.success('供货商信息已更新');
    } else {
      useAppStore.getState().addSupplier(formData);
      toast.success('供货商已添加');
    }

    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个供货商吗？')) {
      useAppStore.getState().deleteSupplier(id);
      toast.success('供货商已删除');
    }
  };

  const handleOpenListModal = () => {
    if (replenishmentList.length === 0) {
      toast.info('当前所有药品库存充足，暂无需补货');
      return;
    }
    setIsListModalOpen(true);
  };

  const generateOrderText = () => {
    const groupedBySupplier = new Map<string, typeof replenishmentList>();
    replenishmentList.forEach((item) => {
      const existing = groupedBySupplier.get(item.supplier.id) || [];
      existing.push(item);
      groupedBySupplier.set(item.supplier.id, existing);
    });

    let text = '【药品补货清单】\n';
    text += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

    groupedBySupplier.forEach((items, _supplierId) => {
      const supplier = items[0].supplier;
      text += `━━━ ${supplier.name} ━━━\n`;
      if (supplier.contactPerson) text += `联系人：${supplier.contactPerson}\n`;
      if (supplier.mainCategory) text += `主营品类：${supplier.mainCategory}\n`;
      if (supplier.phone) text += `电话：${supplier.phone}\n`;
      if (supplier.address) text += `地址：${supplier.address}\n`;
      text += '\n';
      items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.medicine.name}${item.medicine.specification ? `（${item.medicine.specification}）` : ''}\n`;
        text += `   建议补货：${item.suggestedQuantity}盒  |  当前库存：${item.currentStock}盒  |  安全库存：${item.safetyStock}盒\n`;
      });
      text += '\n';
    });

    const totalQty = replenishmentList.reduce((sum, i) => sum + i.suggestedQuantity, 0);
    text += `━━━━━━━━━━━━\n`;
    text += `共需补货 ${totalQty} 盒，涉及 ${replenishmentList.length} 种药品，${groupedBySupplier.size} 家供货商`;

    return text;
  };

  const handleCopyList = async () => {
    try {
      await navigator.clipboard.writeText(generateOrderText());
      setCopied(true);
      toast.success('补货清单已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const groupedBySupplier = () => {
    const map = new Map<string, typeof replenishmentList>();
    replenishmentList.forEach((item) => {
      const existing = map.get(item.supplier.id) || [];
      existing.push(item);
      map.set(item.supplier.id, existing);
    });
    return map;
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find((s) => s.id === supplierId)?.name || '未知供货商';
  };

  const getMedicineName = (medicineId: string) => {
    return medicines.find((m) => m.id === medicineId)?.name || '未知药品';
  };

  const getMedicineSpec = (medicineId: string) => {
    const med = medicines.find((m) => m.id === medicineId);
    return med?.specification || '';
  };

  const handleViewOrder = (order: OrderRecord) => {
    setViewingOrder(order);
    setIsOrderDetailModalOpen(true);
  };

  const handleOpenArrivalModal = (order: OrderRecord) => {
    setArrivalOrder(order);
    const items = order.items
      .filter((item) => item.receivedQuantity < item.orderedQuantity)
      .map((item) => ({
        orderItemId: item.id,
        quantity: String(item.orderedQuantity - item.receivedQuantity),
        productionDate: '',
        expiryDate: '',
        costPrice: String(item.costPrice),
      }));
    setArrivalItems(items);
    setIsArrivalModalOpen(true);
  };

  const handleArrivalItemChange = (index: number, field: string, value: string) => {
    setArrivalItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleConfirmArrival = () => {
    if (!arrivalOrder) return;

    for (const item of arrivalItems) {
      if (!item.quantity || parseInt(item.quantity) <= 0) {
        toast.error('请输入有效的到货数量');
        return;
      }
      if (!isValidDate(item.productionDate)) {
        toast.error('请选择生产日期');
        return;
      }
      if (!isValidDate(item.expiryDate)) {
        toast.error('请选择有效期');
        return;
      }
      if (!item.costPrice || parseFloat(item.costPrice) <= 0) {
        toast.error('请输入有效的进价');
        return;
      }
      if (new Date(item.expiryDate) <= new Date(item.productionDate)) {
        toast.error('有效期必须晚于生产日期');
        return;
      }
    }

    const arrivalData = arrivalItems.map((item) => ({
      orderItemId: item.orderItemId,
      quantity: parseInt(item.quantity),
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      costPrice: parseFloat(item.costPrice),
    }));

    const result = confirmOrderArrival(arrivalOrder.id, arrivalData);
    if (result.success) {
      toast.success('到货确认成功，已自动入库');
      setIsArrivalModalOpen(false);
      setArrivalOrder(null);
      setIsOrderDetailModalOpen(false);
      setViewingOrder(null);
    } else {
      toast.error('到货确认失败，请重试');
    }
  };

  const handleOpenCreateOrderModal = (supplier: Supplier) => {
    const supplierItems = replenishmentList.filter((r) => r.supplier.id === supplier.id);
    if (supplierItems.length === 0) {
      toast.info('该供货商暂无需要补货的药品');
      return;
    }

    setCreateOrderSupplier(supplier);
    const items = supplierItems.map((item) => ({
      medicineId: item.medicine.id,
      quantity: String(item.suggestedQuantity),
      costPrice: String(getMedicineCostPrice(item.medicine.id) || item.medicine.sellPrice * 0.6),
    }));
    setCreateOrderItems(items);
    setIsCreateOrderModalOpen(true);
  };

  const handleCreateOrderItemChange = (index: number, field: string, value: string) => {
    setCreateOrderItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCreateOrder = () => {
    if (!createOrderSupplier) return;

    for (const item of createOrderItems) {
      if (!item.quantity || parseInt(item.quantity) <= 0) {
        toast.error('请输入有效的订货数量');
        return;
      }
      if (!item.costPrice || parseFloat(item.costPrice) <= 0) {
        toast.error('请输入有效的进价');
        return;
      }
    }

    const orderItems = createOrderItems.map((item) => ({
      medicineId: item.medicineId,
      quantity: parseInt(item.quantity),
      costPrice: parseFloat(item.costPrice),
    }));

    const orderId = createOrderFromReplenishment(createOrderSupplier.id, orderItems);
    if (orderId) {
      toast.success('订货单已生成');
      setIsCreateOrderModalOpen(false);
      setIsListModalOpen(false);
      setCreateOrderSupplier(null);
      setActiveTab('orders');
    } else {
      toast.error('生成订货单失败，请重试');
    }
  };

  const getOrderStatusInfo = (status: OrderStatus) => {
    return ORDER_STATUS_MAP[status] || ORDER_STATUS_MAP.pending;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">供货商管理</h1>
          <p className="text-slate-500 mt-1">管理供货商信息和自动补货清单</p>
        </div>
        {activeTab === 'suppliers' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenListModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all font-medium text-sm relative"
            >
              <FileText className="w-5 h-5" />
              补货清单
              {replenishmentList.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  {replenishmentList.length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
            >
              <Plus className="w-5 h-5" />
              添加供货商
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="border-b border-slate-100">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'suppliers'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                供货商管理
              </div>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'orders'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                订货记录
                {orders.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                    {orders.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {activeTab === 'suppliers' && (
          <div className="p-5">
            {replenishmentList.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800">
                      有 {replenishmentList.length} 种药品库存低于安全库存
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      共建议补货 {replenishmentList.reduce((s, i) => s + i.suggestedQuantity, 0)} 盒，
                      涉及 {groupedBySupplier().size} 家供货商。点击右上角「补货清单」查看详情。
                    </p>
                  </div>
                  <button
                    onClick={handleOpenListModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                  >
                    立即查看
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {suppliers.length === 0 ? (
                <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500">暂无供货商，点击右上角添加</p>
                </div>
              ) : (
                suppliers.map((supplier) => {
                  const supplierMeds = useAppStore
                    .getState()
                    .medicines.filter((m) => m.supplierId === supplier.id);
                  const supplierReplenishment = replenishmentList.filter(
                    (r) => r.supplier.id === supplier.id
                  );

                  return (
                    <div
                      key={supplier.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-800">
                                {supplier.name}
                              </h3>
                              {supplierReplenishment.length > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  {supplierReplenishment.length} 种需补货
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1.5">
                              {supplier.contactPerson && (
                                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                  <span className="text-slate-400">联系人:</span>
                                  {supplier.contactPerson}
                                </p>
                              )}
                              {supplier.mainCategory && (
                                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                  <span className="text-slate-400">主营:</span>
                                  {supplier.mainCategory}
                                </p>
                              )}
                              {supplier.phone && (
                                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  <a
                                    href={`tel:${supplier.phone}`}
                                    className="text-emerald-600 hover:underline font-medium"
                                  >
                                    {supplier.phone}
                                  </a>
                                </p>
                              )}
                              {supplier.address && (
                                <p className="text-sm text-slate-500 flex items-start gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{supplier.address}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenModal(supplier)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {supplierMeds.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                            <Pill className="w-3 h-3" />
                            供应药品（{supplierMeds.length}种）
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {supplierMeds.slice(0, 6).map((med) => {
                              const stock = getMedicineStock(med.id);
                              const lowStock = stock <= med.safetyStock;
                              return (
                                <span
                                  key={med.id}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                                    lowStock
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {med.name}
                                  <span className="text-[10px] opacity-70">
                                    {stock}盒
                                  </span>
                                </span>
                              );
                            })}
                            {supplierMeds.length > 6 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs text-slate-400">
                                +{supplierMeds.length - 6}
                              </span>
                            )}
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

        {activeTab === 'orders' && (
          <div>
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">订货记录</h3>
                  <p className="text-xs text-slate-500">从补货清单生成订货单，到货后一键转入库</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500">暂无订货记录</p>
                  <p className="text-sm text-slate-400 mt-1">从补货清单生成你的第一张订货单吧</p>
                </div>
              ) : (
                orders.map((order) => {
                  const statusInfo = getOrderStatusInfo(order.status);
                  const canConfirm = order.status === 'pending' || order.status === 'partial';
                  return (
                    <div key={order.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800">{order.orderNo}</p>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">
                              {getSupplierName(order.supplierId)} · {order.items.length} 种药品
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-lg font-bold text-slate-800">
                              {order.totalQuantity}
                            </p>
                            <p className="text-xs text-slate-500">总数量</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-emerald-600">
                              {formatCurrency(order.totalAmount)}
                            </p>
                            <p className="text-xs text-slate-500">总金额</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500">
                              创建时间
                            </p>
                            <p className="text-sm text-slate-700 font-medium">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              查看详情
                            </button>
                            {canConfirm && (
                              <button
                                onClick={() => handleOpenArrivalModal(order)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors font-medium"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                确认到货
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
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSupplier ? '编辑供货商' : '添加供货商'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              供货商名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="请输入供货商名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              联系人
            </label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) =>
                setFormData({ ...formData, contactPerson: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="请输入联系人姓名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              联系电话
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="请输入联系电话"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              主营品类
            </label>
            <input
              type="text"
              value={formData.mainCategory}
              onChange={(e) =>
                setFormData({ ...formData, mainCategory: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="如：感冒药、消炎药"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              地址
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              placeholder="请输入供货商地址"
            />
          </div>

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
              {editingSupplier ? '保存修改' : '添加供货商'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        title="补货清单"
        size="xl"
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm text-slate-600">
                共 <span className="font-semibold text-slate-800">{replenishmentList.length}</span> 种药品需补货，
                建议补货 <span className="font-semibold text-amber-600">{replenishmentList.reduce((s, i) => s + i.suggestedQuantity, 0)}</span> 盒，
                涉及 <span className="font-semibold text-slate-800">{groupedBySupplier().size}</span> 家供货商
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyList}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制清单
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  const text = generateOrderText();
                  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `补货清单_${new Date().toISOString().split('T')[0]}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('清单已下载');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg hover:shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                导出 TXT
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {Array.from(groupedBySupplier().entries()).map(
              ([_supplierId, items]) => {
                const supplier = items[0].supplier;
                return (
                  <div
                    key={supplier.id}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-slate-50 to-emerald-50 px-5 py-3 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-emerald-500" />
                            {supplier.name}
                          </h4>
                          <div className="flex items-center gap-4 mt-1">
                            {supplier.contactPerson && (
                              <span className="text-xs text-slate-500">
                                联系人: {supplier.contactPerson}
                              </span>
                            )}
                            {supplier.mainCategory && (
                              <span className="text-xs text-slate-500">
                                主营: {supplier.mainCategory}
                              </span>
                            )}
                            {supplier.phone && (
                              <a
                                href={`tel:${supplier.phone}`}
                                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                {supplier.phone}
                              </a>
                            )}
                          </div>
                          {supplier.address && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {supplier.address}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">建议补货</p>
                          <p className="text-lg font-bold text-amber-600">
                            {items.reduce((s, i) => s + i.suggestedQuantity, 0)}
                            <span className="text-sm font-normal text-slate-500 ml-1">盒</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <div
                          key={item.medicine.id}
                          className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                              <Pill className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 text-sm">
                                {item.medicine.name}
                              </p>
                              {item.medicine.specification && (
                                <p className="text-xs text-slate-500">
                                  {item.medicine.specification} · 售价 {formatCurrency(item.medicine.sellPrice)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p
                                className={`text-sm font-semibold ${
                                  item.currentStock === 0
                                    ? 'text-red-600'
                                    : item.currentStock <= item.safetyStock
                                    ? 'text-amber-600'
                                    : 'text-slate-700'
                                }`}
                              >
                                {item.currentStock}
                              </p>
                              <p className="text-[10px] text-slate-400">当前库存</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-semibold text-slate-700">
                                {item.safetyStock}
                              </p>
                              <p className="text-[10px] text-slate-400">安全库存</p>
                            </div>
                            <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                              <Package className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-sm font-semibold text-amber-700">
                                {item.suggestedQuantity} 盒
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
                      <button
                        onClick={() => handleOpenCreateOrderModal(supplier)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg hover:shadow-md transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        生成订货单
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsListModalOpen(false)}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isOrderDetailModalOpen && viewingOrder !== null}
        onClose={() => {
          setIsOrderDetailModalOpen(false);
          setViewingOrder(null);
        }}
        title="订单详情"
        size="lg"
      >
        {viewingOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-xs text-slate-500">订单号</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{viewingOrder.orderNo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">供货商</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {getSupplierName(viewingOrder.supplierId)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">订单状态</p>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border mt-1 ${getOrderStatusInfo(viewingOrder.status).color}`}
                >
                  {getOrderStatusInfo(viewingOrder.status).label}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500">创建时间</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {formatDateTime(viewingOrder.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">总数量</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {viewingOrder.totalQuantity} 盒
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">总金额</p>
                <p className="text-sm font-semibold text-emerald-600 mt-1">
                  {formatCurrency(viewingOrder.totalAmount)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-800 mb-3">订单明细</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">药品名称</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">建议数量</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">订货数量</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">已到货</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">单价</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">金额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingOrder.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">
                            {getMedicineName(item.medicineId)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getMedicineSpec(item.medicineId)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                          {item.suggestedQuantity}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-slate-800">
                          {item.orderedQuantity}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-sm font-medium ${
                              item.receivedQuantity >= item.orderedQuantity
                                ? 'text-emerald-600'
                                : item.receivedQuantity > 0
                                ? 'text-orange-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {item.receivedQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {formatCurrency(item.costPrice)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">
                          {formatCurrency(item.orderedQuantity * item.costPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  setIsOrderDetailModalOpen(false);
                  setViewingOrder(null);
                }}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                关闭
              </button>
              {(viewingOrder.status === 'pending' || viewingOrder.status === 'partial') && (
                <button
                  onClick={() => {
                    setIsOrderDetailModalOpen(false);
                    handleOpenArrivalModal(viewingOrder);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  确认到货
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isArrivalModalOpen && arrivalOrder !== null}
        onClose={() => {
          setIsArrivalModalOpen(false);
          setArrivalOrder(null);
        }}
        title="到货录入"
        size="xl"
      >
        {arrivalOrder && (
          <div className="space-y-5">
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="font-medium text-sky-800">
                    订单 {arrivalOrder.orderNo} - {getSupplierName(arrivalOrder.supplierId)}
                  </p>
                  <p className="text-xs text-sky-600 mt-0.5">
                    请填写到货明细，确认后将自动入库
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {arrivalItems.map((item, index) => {
                const orderItem = arrivalOrder.items.find((i) => i.id === item.orderItemId);
                const remainingQty = orderItem
                  ? orderItem.orderedQuantity - orderItem.receivedQuantity
                  : 0;
                return (
                  <div
                    key={item.orderItemId}
                    className="p-4 border border-slate-200 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                          <Pill className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {getMedicineName(orderItem?.medicineId || '')}
                          </p>
                          <p className="text-xs text-slate-500">
                            剩余未到货: {remainingQty} 盒
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          到货数量 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={remainingQty}
                          value={item.quantity}
                          onChange={(e) => handleArrivalItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          生产日期 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={item.productionDate}
                          onChange={(e) => handleArrivalItemChange(index, 'productionDate', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          有效期 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => handleArrivalItemChange(index, 'expiryDate', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          进价（元） <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.costPrice}
                          onChange={(e) => handleArrivalItemChange(index, 'costPrice', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsArrivalModalOpen(false);
                  setArrivalOrder(null);
                }}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={handleConfirmArrival}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
              >
                确认到货
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCreateOrderModalOpen && createOrderSupplier !== null}
        onClose={() => {
          setIsCreateOrderModalOpen(false);
          setCreateOrderSupplier(null);
        }}
        title="生成订货单"
        size="lg"
      >
        {createOrderSupplier && (
          <div className="space-y-5">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-emerald-800">{createOrderSupplier.name}</p>
                  {createOrderSupplier.contactPerson && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      联系人: {createOrderSupplier.contactPerson}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-800 mb-3">订货明细</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">药品名称</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">当前库存</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">订货数量</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">进价（元）</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">金额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {createOrderItems.map((item, index) => {
                      const med = medicines.find((m) => m.id === item.medicineId);
                      const qty = parseInt(item.quantity) || 0;
                      const price = parseFloat(item.costPrice) || 0;
                      return (
                        <tr key={item.medicineId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800">{med?.name}</p>
                            <p className="text-xs text-slate-500">{med?.specification}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600">
                            {getMedicineStock(item.medicineId)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleCreateOrderItemChange(index, 'quantity', e.target.value)}
                              className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item.costPrice}
                              onChange={(e) => handleCreateOrderItemChange(index, 'costPrice', e.target.value)}
                              className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">
                            {formatCurrency(qty * price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-slate-600">
                        合计：
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-slate-800">
                        {createOrderItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)} 盒
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">
                        {formatCurrency(
                          createOrderItems.reduce(
                            (sum, item) => sum + (parseInt(item.quantity) || 0) * (parseFloat(item.costPrice) || 0),
                            0
                          )
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsCreateOrderModalOpen(false);
                  setCreateOrderSupplier(null);
                }}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={handleCreateOrder}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
              >
                确认生成
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
