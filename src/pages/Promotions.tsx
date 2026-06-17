import { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  Percent,
  Gift,
  Calendar,
  Pill,
  TrendingUp,
  Package,
  CircleDollarSign,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import type { Promotion } from '@/types';
import { formatCurrency, formatDate } from '@/utils';

export function Promotions() {
  const {
    medicines,
    promotions,
    saleRecords,
    addPromotion,
    updatePromotion,
    deletePromotion,
  } = useAppStore();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null
  );

  const [formData, setFormData] = useState({
    name: '',
    type: 'buy_get_free' as Promotion['type'],
    medicineId: '',
    buyQuantity: '2',
    freeQuantity: '1',
    discount: '9',
    startDate: '',
    endDate: '',
  });

  const getMedicineName = (id: string) =>
    medicines.find((m) => m.id === id)?.name || '-';

  const getPromotionStats = (promotionId: string) => {
    const promoSales = saleRecords.filter((s) => s.promotionId === promotionId);
    const paidQty = promoSales.reduce((sum, s) => sum + s.quantity, 0);
    const freeQty = promoSales.reduce((sum, s) => sum + (s.freeQuantity || 0), 0);
    const revenue = promoSales.reduce((sum, s) => sum + s.totalAmount, 0);
    return { paidQty, freeQty, revenue, orderCount: promoSales.length };
  };

  const isPromotionActive = (promo: Promotion) => {
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);
    end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  };

  const handleOpenModal = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        name: promotion.name,
        type: promotion.type,
        medicineId: promotion.medicineId,
        buyQuantity: promotion.buyQuantity?.toString() || '2',
        freeQuantity: promotion.freeQuantity?.toString() || '1',
        discount: promotion.discount?.toString() || '9',
        startDate: promotion.startDate,
        endDate: promotion.endDate,
      });
    } else {
      setEditingPromotion(null);
      const today = new Date();
      const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      setFormData({
        name: '',
        type: 'buy_get_free',
        medicineId: medicines[0]?.id || '',
        buyQuantity: '2',
        freeQuantity: '1',
        discount: '9',
        startDate: today.toISOString().split('T')[0],
        endDate: nextMonth.toISOString().split('T')[0],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.medicineId || !formData.startDate || !formData.endDate) {
      toast.error('请填写必填项');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('结束日期不能早于开始日期');
      return;
    }

    if (formData.type === 'buy_get_free') {
      if (
        !formData.buyQuantity ||
        !formData.freeQuantity ||
        parseInt(formData.buyQuantity) <= 0 ||
        parseInt(formData.freeQuantity) <= 0
      ) {
        toast.error('请输入有效的买赠数量');
        return;
      }
    } else {
      if (
        !formData.discount ||
        parseFloat(formData.discount) <= 0 ||
        parseFloat(formData.discount) >= 10
      ) {
        toast.error('折扣值需要在 0-10 之间（不包含 0 和 10）');
        return;
      }
    }

    const promotionData = {
      name: formData.name,
      type: formData.type,
      medicineId: formData.medicineId,
      buyQuantity: formData.type === 'buy_get_free' ? parseInt(formData.buyQuantity) : undefined,
      freeQuantity: formData.type === 'buy_get_free' ? parseInt(formData.freeQuantity) : undefined,
      discount:
        formData.type === 'discount' ? parseFloat(formData.discount) : undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isActive: true,
    };

    if (editingPromotion) {
      updatePromotion(editingPromotion.id, promotionData);
      toast.success('促销活动已更新');
    } else {
      addPromotion(promotionData);
      toast.success('促销活动已创建');
    }

    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个促销活动吗？')) {
      deletePromotion(id);
      toast.success('促销活动已删除');
    }
  };

  const sortedPromotions = useMemo(() => {
    return [...promotions].sort((a, b) => {
      const aActive = isPromotionActive(a);
      const bActive = isPromotionActive(b);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [promotions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">促销活动</h1>
          <p className="text-slate-500 mt-1">
            管理买赠和折扣活动，共 {promotions.length} 个活动
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all font-medium text-sm"
        >
          <Plus className="w-5 h-5" />
          新建活动
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">进行中活动</p>
              <p className="text-2xl font-bold text-slate-800">
                {promotions.filter(isPromotionActive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">活动总销量</p>
              <p className="text-2xl font-bold text-slate-800">
                {
                  promotions.reduce(
                    (sum, p) => sum + getPromotionStats(p.id).paidQty + getPromotionStats(p.id).freeQty,
                    0
                  )
                }
                <span className="text-sm font-normal text-slate-500 ml-1">盒</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">活动总销售额</p>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(
                  promotions.reduce(
                    (sum, p) => sum + getPromotionStats(p.id).revenue,
                    0
                  )
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sortedPromotions.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">暂无促销活动，点击右上角新建</p>
          </div>
        ) : (
          sortedPromotions.map((promo) => {
            const stats = getPromotionStats(promo.id);
            const active = isPromotionActive(promo);
            const med = medicines.find((m) => m.id === promo.medicineId);

            return (
              <div
                key={promo.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  active ? 'border-violet-200' : 'border-slate-100 opacity-80'
                }`}
              >
                <div
                  className={`px-5 py-4 border-b flex items-center justify-between ${
                    active
                      ? 'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        active
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                          : 'bg-slate-200'
                      }`}
                    >
                      {promo.type === 'buy_get_free' ? (
                        <Gift
                          className={`w-5 h-5 ${
                            active ? 'text-white' : 'text-slate-500'
                          }`}
                        />
                      ) : (
                        <Percent
                          className={`w-5 h-5 ${
                            active ? 'text-white' : 'text-slate-500'
                          }`}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{promo.name}</p>
                        {active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                            进行中
                          </span>
                        ) : new Date(promo.startDate) > new Date() ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                            未开始
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            已结束
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(promo)}
                      className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Pill className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {med?.name || '已删除药品'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {med?.specification || ''}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-sm font-medium text-slate-700">
                      {promo.type === 'buy_get_free'
                        ? `买 ${promo.buyQuantity} 盒送 ${promo.freeQuantity} 盒`
                        : `${promo.discount} 折优惠`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {promo.type === 'buy_get_free'
                        ? `每买 ${promo.buyQuantity} 盒可获得 ${promo.freeQuantity} 盒赠品，赠送盒数也会扣减库存`
                        : `按原价的 ${promo.discount * 10}% 销售`}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-3 pt-2">
                    <div className="text-center p-3 bg-sky-50 rounded-xl">
                      <p className="text-xs text-sky-600">收款盒数</p>
                      <p className="text-lg font-bold text-sky-700 mt-1">
                        {stats.paidQty}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-violet-50 rounded-xl">
                      <p className="text-xs text-violet-600">赠送盒数</p>
                      <p className="text-lg font-bold text-violet-700 mt-1">
                        {stats.freeQty}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-xl">
                      <p className="text-xs text-emerald-600">实际出库</p>
                      <p className="text-lg font-bold text-emerald-700 mt-1">
                        {stats.paidQty + stats.freeQty}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-xl">
                      <p className="text-xs text-amber-600">销售额</p>
                      <p className="text-lg font-bold text-amber-700 mt-1">
                        {formatCurrency(stats.revenue)}
                      </p>
                    </div>
                  </div>

                  {promo.type === 'buy_get_free' && stats.paidQty > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                      <Package className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <p className="text-xs text-emerald-700">
                        活动期间通过买赠实际多卖出了{' '}
                        <span className="font-bold text-emerald-800">
                          {stats.freeQty}
                        </span>{' '}
                        盒（赠品），相当于{' '}
                        <span className="font-bold text-emerald-800">
                          {(((stats.freeQty) / (stats.paidQty + stats.freeQty)) * 100).toFixed(1)}%
                        </span>{' '}
                        的赠送率
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingPromotion ? '编辑促销活动' : '新建促销活动'}
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              placeholder="如：春季感冒灵买二送一"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              活动类型
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'buy_get_free' })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.type === 'buy_get_free'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Gift
                    className={`w-5 h-5 ${
                      formData.type === 'buy_get_free' ? 'text-violet-500' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      formData.type === 'buy_get_free' ? 'text-violet-700' : 'text-slate-700'
                    }`}
                  >
                    买赠活动
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  如买二送一，系统自动扣减赠品库存
                </p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'discount' })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.type === 'discount'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Percent
                    className={`w-5 h-5 ${
                      formData.type === 'discount' ? 'text-violet-500' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      formData.type === 'discount' ? 'text-violet-700' : 'text-slate-700'
                    }`}
                  >
                    折扣活动
                  </span>
                </div>
                <p className="text-xs text-slate-500">如 9 折优惠</p>
              </button>
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
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} - {m.specification}
                </option>
              ))}
            </select>
          </div>

          {formData.type === 'buy_get_free' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  买多少盒
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.buyQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, buyQuantity: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  placeholder="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  送多少盒
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.freeQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, freeQuantity: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  placeholder="1"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                折扣值（0-10，不包含 0 和 10，9 代表 9 折）
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="9.9"
                value={formData.discount}
                onChange={(e) =>
                  setFormData({ ...formData, discount: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                placeholder="9"
              />
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
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
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
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
            </div>
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
              className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all font-medium text-sm"
            >
              {editingPromotion ? '保存修改' : '创建活动'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
