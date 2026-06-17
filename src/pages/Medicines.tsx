import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  Pill,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { MEDICINE_CATEGORIES } from '@/types';
import type { Medicine } from '@/types';
import {
  getDaysUntilExpiry,
  getExpiryStatus,
  getExpiryStatusText,
  getExpiryStatusColor,
  formatCurrency,
  formatDate,
} from '@/utils';

export function Medicines() {
  const { medicines, suppliers, addMedicine, updateMedicine, deleteMedicine } =
    useAppStore();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: MEDICINE_CATEGORIES[0],
    specification: '',
    costPrice: '',
    sellPrice: '',
    stock: '',
    safetyStock: '10',
    productionDate: '',
    expiryDate: '',
    supplierId: '',
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
        costPrice: medicine.costPrice.toString(),
        sellPrice: medicine.sellPrice.toString(),
        stock: medicine.stock.toString(),
        safetyStock: medicine.safetyStock.toString(),
        productionDate: medicine.productionDate,
        expiryDate: medicine.expiryDate,
        supplierId: medicine.supplierId,
      });
    } else {
      setEditingMedicine(null);
      setFormData({
        name: '',
        category: MEDICINE_CATEGORIES[0],
        specification: '',
        costPrice: '',
        sellPrice: '',
        stock: '',
        safetyStock: '10',
        productionDate: '',
        expiryDate: '',
        supplierId: suppliers[0]?.id || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMedicine(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.costPrice || !formData.sellPrice || !formData.stock) {
      toast.error('请填写必填项');
      return;
    }

    const medicineData = {
      name: formData.name,
      category: formData.category,
      specification: formData.specification,
      costPrice: parseFloat(formData.costPrice),
      sellPrice: parseFloat(formData.sellPrice),
      stock: parseInt(formData.stock),
      safetyStock: parseInt(formData.safetyStock) || 10,
      productionDate: formData.productionDate,
      expiryDate: formData.expiryDate,
      supplierId: formData.supplierId,
    };

    if (editingMedicine) {
      updateMedicine(editingMedicine.id, medicineData);
      toast.success('药品信息已更新');
    } else {
      addMedicine(medicineData);
      toast.success('药品添加成功');
    }

    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个药品吗？删除后无法恢复。')) {
      deleteMedicine(id);
      toast.success('药品已删除');
    }
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find((s) => s.id === supplierId)?.name || '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">药品管理</h1>
          <p className="text-slate-500 mt-1">管理所有药品信息，共 {medicines.length} 种药品</p>
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  药品信息
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  分类
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  库存
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  进价/售价
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  有效期
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  供货商
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicines.map((med) => {
                const days = getDaysUntilExpiry(med.expiryDate);
                const status = getExpiryStatus(days);
                return (
                  <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                        <Pill className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{med.name}</p>
                        <p className="text-xs text-slate-500">{med.specification}</p>
                      </div>
                    </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {med.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800">
                        {med.stock} 盒
                      </p>
                      <p className="text-xs text-slate-500">安全库存: {med.safetyStock}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-800">
                        <span className="text-slate-500">进</span> {formatCurrency(med.costPrice)}
                      </p>
                      <p className="text-sm text-slate-800">
                        <span className="text-slate-500">售</span> {formatCurrency(med.sellPrice)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getExpiryStatusColor(
                          status
                        )}`}
                      >
                        {getExpiryStatusText(status)}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        至 {formatDate(med.expiryDate)}
                        {days > 0 ? `（${days}天后过期` : `（已过期${Math.abs(days)}天）`}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {getSupplierName(med.supplierId)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(med)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(med.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredMedicines.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">暂无药品数据</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMedicine ? '编辑药品' : '添加药品'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
              进价（元） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.costPrice}
              onChange={(e) =>
                setFormData({ ...formData, costPrice: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="0.00"
            />
          </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                初始库存（盒） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="0"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                生产日期
              </label>
              <input
                type="date"
                value={formData.productionDate}
                onChange={(e) =>
                  setFormData({ ...formData, productionDate: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                有效期至
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
    </div>
  );
}
