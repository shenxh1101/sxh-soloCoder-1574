import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  PackageX,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowRight,
  Clock,
  ShoppingCart,
  PackagePlus,
  Pill,
  Phone,
  ListChecks,
  Layers,
} from 'lucide-react';
import { useAppStore } from '@/store';
import type { BatchStatus } from '@/types';
import {
  getDaysUntilExpiry,
  getExpiryStatus,
  getExpiryStatusText,
  getExpiryStatusColor,
  getStockAlertStatus,
  getStockAlertStatusText,
  getStockAlertColor,
  formatCurrency,
  isToday,
} from '@/utils';

const BATCH_STATUS_TABS: { value: BatchStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'normal', label: '正常' },
  { value: 'discount', label: '折价处理' },
  { value: 'off_shelf', label: '已下架' },
  { value: 'returning', label: '退货中' },
];

const getBatchStatusColor = (status: BatchStatus): string => {
  const colorMap: Record<BatchStatus, string> = {
    normal: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    off_shelf: 'text-slate-500 bg-slate-100 border-slate-200',
    returning: 'text-orange-600 bg-orange-50 border-orange-200',
    discount: 'text-violet-600 bg-violet-50 border-violet-200',
  };
  return colorMap[status];
};

const getBatchStatusText = (status: BatchStatus): string => {
  const textMap: Record<BatchStatus, string> = {
    normal: '正常',
    off_shelf: '已下架',
    returning: '退货中',
    discount: '折价处理',
  };
  return textMap[status];
};

export function Dashboard() {
  const { medicines, batches, saleRecords, suppliers, getMedicineStock, getReplenishmentList } =
    useAppStore();
  const [expiryFilterStatus, setExpiryFilterStatus] = useState<BatchStatus | 'all'>('all');

  const expiryStats = useMemo(() => {
    let expired = 0;
    let urgent = 0;
    let warning = 0;
    const expiringBatches: typeof batches = [];

    batches
      .filter((b) => b.quantity > 0)
      .forEach((batch) => {
        const days = getDaysUntilExpiry(batch.expiryDate);
        const status = getExpiryStatus(days);
        if (status !== 'normal') {
          expiringBatches.push(batch);
        }
        if (status === 'expired') expired++;
        else if (status === 'urgent') urgent++;
        else if (status === 'warning') warning++;
      });

    expiringBatches.sort(
      (a, b) =>
        (getDaysUntilExpiry(a.expiryDate) ?? 9999) -
        (getDaysUntilExpiry(b.expiryDate) ?? 9999)
    );

    return { expired, urgent, warning, expiringBatches };
  }, [batches]);

  const stockStats = useMemo(() => {
    let outOfStock = 0;
    let critical = 0;
    let warning = 0;
    const lowStockMedicines: typeof medicines = [];

    medicines.forEach((med) => {
      const stock = getMedicineStock(med.id);
      const status = getStockAlertStatus(stock, med.safetyStock);
      if (status !== 'normal') {
        lowStockMedicines.push(med);
      }
      if (status === 'out_of_stock') outOfStock++;
      else if (status === 'critical') critical++;
      else if (status === 'warning') warning++;
    });

    lowStockMedicines.sort((a, b) => getMedicineStock(a.id) - getMedicineStock(b.id));

    return { outOfStock, critical, warning, lowStockMedicines };
  }, [medicines, getMedicineStock]);

  const todaySales = useMemo(() => {
    const todayRecords = saleRecords.filter((r) => isToday(r.saleTime));
    const totalAmount = todayRecords.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalProfit = todayRecords.reduce((sum, r) => sum + r.profit, 0);
    const totalQuantity = todayRecords.reduce((sum, r) => sum + r.quantity + r.freeQuantity, 0);
    return { totalAmount, totalProfit, totalQuantity, count: todayRecords.length };
  }, [saleRecords]);

  const batchStatusStats = useMemo(() => {
    let normal = 0;
    let discount = 0;
    let offShelf = 0;
    let returning = 0;
    const total = batches.length;

    batches.forEach((batch) => {
      if (batch.status === 'normal') normal++;
      else if (batch.status === 'discount') discount++;
      else if (batch.status === 'off_shelf') offShelf++;
      else if (batch.status === 'returning') returning++;
    });

    return { total, normal, discount, offShelf, returning };
  }, [batches]);

  const filteredExpiringBatches = useMemo(() => {
    if (expiryFilterStatus === 'all') {
      return expiryStats.expiringBatches;
    }
    return expiryStats.expiringBatches.filter((b) => b.status === expiryFilterStatus);
  }, [expiryStats.expiringBatches, expiryFilterStatus]);

  const replenishmentList = useMemo(() => getReplenishmentList(), [getReplenishmentList]);

  const getMedicineName = (medicineId: string) => {
    return medicines.find((m) => m.id === medicineId)?.name || '未知药品';
  };

  const getMedicineSpec = (medicineId: string) => {
    const med = medicines.find((m) => m.id === medicineId);
    return med ? med.specification : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>
          <p className="text-slate-500 mt-1">欢迎回来，今天是管理药店的好日子～</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/suppliers"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <ListChecks className="w-4 h-4" />
            补货清单 ({replenishmentList.length})
          </Link>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            快速销售
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-1 rounded-full">
              {expiryStats.expired + expiryStats.urgent + expiryStats.warning} 批
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-slate-500">过期预警</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {expiryStats.expired + expiryStats.urgent + expiryStats.warning}
            </p>
          </div>
          <div className="flex gap-2 mt-3 text-xs">
            <span className="text-red-500">已过期 {expiryStats.expired}</span>
            <span className="text-slate-300">|</span>
            <span className="text-orange-500">7天内 {expiryStats.urgent}</span>
            <span className="text-slate-300">|</span>
            <span className="text-amber-500">30天内 {expiryStats.warning}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <PackageX className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              {stockStats.outOfStock + stockStats.critical + stockStats.warning} 种
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-slate-500">库存预警</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {stockStats.outOfStock + stockStats.critical + stockStats.warning}
            </p>
          </div>
          <div className="flex gap-2 mt-3 text-xs">
            <span className="text-red-500">缺货 {stockStats.outOfStock}</span>
            <span className="text-slate-300">|</span>
            <span className="text-orange-500">严重 {stockStats.critical}</span>
            <span className="text-slate-300">|</span>
            <span className="text-amber-500">偏低 {stockStats.warning}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              今日
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-slate-500">今日销售额</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {formatCurrency(todaySales.totalAmount)}
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            共 {todaySales.count} 笔订单，{todaySales.totalQuantity} 件商品
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-sky-500" />
            </div>
            <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-1 rounded-full">
              今日利润
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-slate-500">今日利润</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {formatCurrency(todaySales.totalProfit)}
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            利润率{' '}
            {todaySales.totalAmount > 0
              ? ((todaySales.totalProfit / todaySales.totalAmount) * 100).toFixed(1)
              : 0}
            %
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-violet-500" />
            </div>
            <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
              {batchStatusStats.total} 批
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-slate-500">批次状态</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {batchStatusStats.total}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">正常</span>
              <span className="font-medium text-emerald-600">{batchStatusStats.normal}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">折价处理</span>
              <span className="font-medium text-violet-600">{batchStatusStats.discount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">已下架</span>
              <span className="font-medium text-slate-500">{batchStatusStats.offShelf}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">退货中</span>
              <span className="font-medium text-orange-600">{batchStatusStats.returning}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">即将过期批次</h3>
                  <p className="text-xs text-slate-500">按批次精确追踪有效期</p>
                </div>
              </div>
              <Link
                to="/medicines"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
              >
                查看全部
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex gap-1">
              {BATCH_STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setExpiryFilterStatus(tab.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    expiryFilterStatus === tab.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {filteredExpiringBatches.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-slate-500">该状态下暂无临期批次 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpiringBatches.slice(0, 5).map((batch) => {
                  const days = getDaysUntilExpiry(batch.expiryDate);
                  const status = getExpiryStatus(days);
                  const isGreyed =
                    expiryFilterStatus === 'all' &&
                    (batch.status === 'off_shelf' || batch.status === 'returning');
                  return (
                    <div
                      key={batch.id}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        isGreyed
                          ? 'bg-slate-50/50 opacity-60'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Pill className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {getMedicineName(batch.medicineId)}
                          </p>
                          <p className="text-xs text-slate-500">
                            批次号: {batch.batchNo} · {getMedicineSpec(batch.medicineId)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getExpiryStatusColor(
                              status
                            )}`}
                          >
                            {getExpiryStatusText(status)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getBatchStatusColor(
                              batch.status
                            )}`}
                          >
                            {getBatchStatusText(batch.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {days !== null
                            ? days > 0
                              ? `还剩 ${days} 天 · 库存 ${batch.quantity} 盒`
                              : `已过期 ${Math.abs(days)} 天 · 库存 ${batch.quantity} 盒`
                            : '未设置有效期'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                <PackageX className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-slate-800">库存预警</h3>
            </div>
          </div>
          <div className="p-5">
            {stockStats.lowStockMedicines.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PackageX className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-slate-500">库存都很充足 ✨</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stockStats.lowStockMedicines.slice(0, 5).map((med) => {
                  const stock = getMedicineStock(med.id);
                  const status = getStockAlertStatus(stock, med.safetyStock);
                  return (
                    <div
                      key={med.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{med.name}</p>
                        <p className="text-xs text-slate-500">安全库存: {med.safetyStock} 盒</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStockAlertColor(
                            status
                          )}`}
                        >
                          {getStockAlertStatusText(status)}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">当前库存: {stock} 盒</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {replenishmentList.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <ListChecks className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">补货清单</h3>
                <p className="text-xs text-slate-500">以下药品库存不足，建议尽快补货</p>
              </div>
            </div>
            <Link
              to="/suppliers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium text-sm"
            >
              <Phone className="w-4 h-4" />
              查看供货商联系方式
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {replenishmentList.slice(0, 4).map((item) => (
              <div
                key={item.medicine.id}
                className="bg-white/80 backdrop-blur rounded-xl p-3 border border-amber-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{item.medicine.name}</p>
                    <p className="text-xs text-slate-500">
                      当前: {item.currentStock} / 安全: {item.safetyStock}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                    建议补 {item.suggestedQuantity} 盒
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Plus className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold mb-2">新增药品</h3>
          <p className="text-sm text-emerald-100 mb-4">
            添加新的药品信息，支持多批次管理
          </p>
          <Link
            to="/medicines"
            className="inline-flex items-center gap-2 bg-white text-emerald-600 px-4 py-2 rounded-xl font-medium text-sm hover:bg-emerald-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加药品
          </Link>
        </div>

        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <PackagePlus className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold mb-2">药品入库</h3>
          <p className="text-sm text-sky-100 mb-4">
            按批次登记入库，记录生产日期和有效期
          </p>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 bg-white text-sky-600 px-4 py-2 rounded-xl font-medium text-sm hover:bg-sky-50 transition-colors"
          >
            <PackagePlus className="w-4 h-4" />
            立即入库
          </Link>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold mb-2">供货商管理</h3>
          <p className="text-sm text-violet-100 mb-4">
            管理供货商信息，共 {suppliers.length} 家供货商
          </p>
          <Link
            to="/suppliers"
            className="inline-flex items-center gap-2 bg-white text-violet-600 px-4 py-2 rounded-xl font-medium text-sm hover:bg-violet-50 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            查看详情
          </Link>
        </div>
      </div>
    </div>
  );
}
