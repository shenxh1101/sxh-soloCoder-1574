import { useState } from 'react';
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
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import type { Supplier } from '@/types';
import { formatCurrency } from '@/utils';

export function Suppliers() {
  const { suppliers, getReplenishmentList, getMedicineStock } = useAppStore();
  const toast = useToast();

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

  const replenishmentList = getReplenishmentList();

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

    groupedBySupplier.forEach((items, supplierId) => {
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

  // Group replenishment items by supplier
  const groupedBySupplier = () => {
    const map = new Map<string, typeof replenishmentList>();
    replenishmentList.forEach((item) => {
      const existing = map.get(item.supplier.id) || [];
      existing.push(item);
      map.set(item.supplier.id, existing);
    });
    return map;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">供货商管理</h1>
          <p className="text-slate-500 mt-1">管理供货商信息和自动补货清单</p>
        </div>
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
      </div>

      {replenishmentList.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
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
              ([supplierId, items]) => {
                const supplier = items[0].supplier;
                return (
                  <div
                    key={supplierId}
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
    </div>
  );
}
