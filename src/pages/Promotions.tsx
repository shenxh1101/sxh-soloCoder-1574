import { useState, useMemo } from 'react';
import {
  Plus,
  Tag,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  TrendingUp,
  Gift,
  Percent,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import type { Promotion } from '@/types';
import {
  formatCurrency,
  formatDate,
  isPromotionActive,
  isDateInRange,
} from '@/utils';

export function Promotions() {
  const {
    promotions,
    medicines,
    saleRecords,
    addPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotionActive,
  } = useAppStore();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'buy_get_free' as 'buy_get_free' | 'discount',
    medicineId: '',
    buyQuantity: 2,
    freeQuantity: 1,
    discount: 0.8,
    startDate: '',
    endDate: '',
    isActive: true,
  });

  const activeCount = useMemo(
    () => promotions.filter((p) => isPromotionActive(p)).length,
    [promotions]
  );

  const getPromoEffect = (promotion: Promotion) => {
    const promoSales = saleRecords.filter(
      (r) => r.promotionId === promotion.id
    );
    const totalQuantity = promoSales.reduce((sum, r) => sum + r.quantity, 0);
    const totalAmount = promoSales.reduce((sum, r) => sum + r.totalAmount, 0);

    const medicine = medicines.find((m) => m.id === promotion.medicineId);
    const originalPrice = medicine?.sellPrice || 0;
    const originalTotal = totalQuantity * originalPrice;
    const extraSales = originalTotal - totalAmount;

    return { totalQuantity, totalAmount, extraSales };
  };

  const openModal = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        name: promotion.name,
        type: promotion.type,
        medicineId: promotion.medicineId,
        buyQuantity: promotion.buyQuantity,
        freeQuantity: promotion.freeQuantity,
        discount: promotion.discount,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        isActive: promotion.isActive,
      });
    } else {
      setEditingPromotion(null);
      setFormData({
        name: '',
        type: 'buy_get_free',
        medicineId: medicines[0]?.id || '',
        buyQuantity: 2,
        freeQuantity: 1,
        discount: 0.8,
        startDate: formatDate(new Date()),
        endDate: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.medicineId || !formData.startDate || !formData.endDate) {
      toast.error('请填写必填项');
      return;
    }

    const promotionData = {
      name: formData.name,
      type: formData.type,
      medicineId: formData.medicineId,
      buyQuantity: formData.buyQuantity,
      freeQuantity: formData.freeQuantity,
      discount: formData.discount,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isActive: formData.isActive,
    };

    if (editingPromotion) {
      updatePromotion(editingPromotion.id, promotionData);
      toast.success('活动已更新');
    } else {
      addPromotion(promotionData);
      toast.success('活动创建成功');
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个促销活动吗？')) {
      deletePromotion(id);
      toast.success('活动已删除');
    }
  };

  const handleToggle = (id: string) => {
    togglePromotionActive(id);
  };

  const getMedicineName = (medicineId: string) => {
    return medicines.find((m) => m.id === medicineId)?.name || '-';
  };

  const getPromotionTypeText = (type: string) => {
    return type === 'buy_get_free' ? '买赠活动' : '折扣活动';
  };

  const getPromotionDesc = (promotion: Promotion) => {
    if (promotion.type === 'buy_get_free') {
      return `买${promotion.buyQuantity}送${promotion.freeQuantity}`;
    }
    return `${(promotion.discount * 10).toFixed(1)}折优惠`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">促销活动</h1>
          <p className="text-slate-500 mt-1">
            管理促销活动，共 {promotions.length} 个活动，进行中 {activeCount} 个
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
        >
          <Plus className="w-5 h-5" />
          创建活动
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Tag className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm">进行中活动</p>
          <p className="text-3xl font-bold mt-1">{activeCount}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Gift className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm">买赠活动</p>
          <p className="text-3xl font-bold mt-1">
            {promotions.filter((p) => p.type === 'buy_get_free').length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Percent className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm">折扣活动</p>
          <p className="text-3xl font-bold mt-1">
            {promotions.filter((p) => p.type === 'discount').length}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {promotions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 mb-4">暂无促销活动</p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              创建第一个活动
            </button>
          </div>
        ) : (
          promotions.map((promotion) => {
            const isActive = isPromotionActive(promotion);
            const effect = getPromoEffect(promotion);
            return (
              <div
                key={promotion.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  isActive ? 'border-emerald-200' : 'border-slate-100'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          promotion.type === 'buy_get_free'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-violet-50 text-violet-600'
                        }`}
                      >
                        {promotion.type === 'buy_get_free' ? (
                          <Gift className="w-6 h-6" />
                        ) : (
                          <Percent className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">
                            {promotion.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isActive ? '进行中' : '已结束'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {getMedicineName(promotion.medicineId)} ·{' '}
                          {getPromotionTypeText(promotion.type)}
                        </p>
                        <p className="text-sm font-medium text-emerald-600 mt-1">
                          {getPromotionDesc(promotion)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(promotion.id)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title={promotion.isActive ? '停用' : '启用'}
                      >
                        {promotion.isActive ? (
                          <ToggleRight className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => openModal(promotion)}
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(promotion.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        活动时间
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {formatDate(promotion.startDate)} ~{' '}
                        {formatDate(promotion.endDate)}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">活动销量</div>
                      <p className="text-sm font-medium text-slate-700">
                        {effect.totalQuantity} 件
                      </p>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">活动销售额</div>
                      <p className="text-sm font-medium text-slate-700">
                        {formatCurrency(effect.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        优惠金额
                      </div>
                      <p className="text-sm font-medium text-emerald-600">
                        {formatCurrency(effect.extraSales)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingPromotion ? '编辑活动' : '创建促销活动'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              活动名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="如：维生素C买二送一"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              活动类型
            </label>
            <div className="flex gap-3">
              <label className="flex-1">
                <input
                  type="radio"
                  name="type"
                  value="buy_get_free"
                  checked={formData.type === 'buy_get_free'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'buy_get_free' | 'discount',
                    })
                  }
                  className="sr-only"
                />
                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.type === 'buy_get_free'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Gift
                      className={`w-5 h-5 ${
                        formData.type === 'buy_get_free'
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="font-medium text-slate-800">买赠活动</span>
                  </div>
                  <p className="text-xs text-slate-500">买几送几，如买二送一</p>
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="type"
                  value="discount"
                  checked={formData.type === 'discount'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'buy_get_free' | 'discount',
                    })
                  }
                  className="sr-only"
                />
                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.type === 'discount'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Percent
                      className={`w-5 h-5 ${
                        formData.type === 'discount'
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="font-medium text-slate-800">折扣活动</span>
                  </div>
                  <p className="text-xs text-slate-500">打折优惠，如8折</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              参与药品 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.medicineId}
              onChange={(e) =>
                setFormData({ ...formData, medicineId: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              {medicines.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name} - {med.specification}（售价: {formatCurrency(med.sellPrice)}）
                </option>
              ))}
            </select>
          </div>

          {formData.type === 'buy_get_free' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  购买数量
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.buyQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      buyQuantity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  赠送数量
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.freeQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      freeQuantity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                折扣率
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={formData.discount}
                  onChange={(e) =>
                    setFormData({ ...formData, discount: parseFloat(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-lg font-bold text-emerald-600 w-16 text-right">
                  {(formData.discount * 10).toFixed(1)}折
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                开始日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                结束日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              立即使活动生效
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
            >
              {editingPromotion ? '保存修改' : '创建活动'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
