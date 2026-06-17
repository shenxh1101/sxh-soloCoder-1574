import { useMemo } from 'react';
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
} from 'lucide-react';
import { useAppStore } from '@/store';
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

export function Dashboard() {
  const { medicines, saleRecords, suppliers } = useAppStore();

  const expiryStats = useMemo(() => {
    let expired = 0;
    let urgent = 0;
    let warning = 0;
    const expiringMedicines: typeof medicines = [];

    medicines.forEach((med) => {
      const days = getDaysUntilExpiry(med.expiryDate);
      const status = getExpiryStatus(days);
      if (status !== 'normal') {
        expiringMedicines.push(med);
      }
      if (status === 'expired') expired++;
      else if (status === 'urgent') urgent++;
      else if (status === 'warning') warning++;
    });

    expiringMedicines.sort(
      (a, b) => getDaysUntilExpiry(a.expiryDate) - getDaysUntilExpiry(b.expiryDate)
    );

    return { expired, urgent, warning, expiringMedicines };
  }, [medicines]);

  const stockStats = useMemo(() => {
    let outOfStock = 0;
    let critical = 0;
    let warning = 0;
    const lowStockMedicines: typeof medicines = [];

    medicines.forEach((med) => {
      const status = getStockAlertStatus(med.stock, med.safetyStock);
      if (status !== 'normal') {
        lowStockMedicines.push(med);
      }
      if (status === 'out_of_stock') outOfStock++;
      else if (status === 'critical') critical++;
      else if (status === 'warning') warning++;
    });

    lowStockMedicines.sort((a, b) => a.stock - b.stock);

    return { outOfStock, critical, warning, lowStockMedicines };
  }, [medicines]);

  const todaySales = useMemo(() => {
    const todayRecords = saleRecords.filter((r) => isToday(r.saleTime));
    const totalAmount = todayRecords.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalProfit = todayRecords.reduce((sum, r) => sum + r.profit, 0);
    const totalQuantity = todayRecords.reduce((sum, r) => sum + r.quantity, 0);
    return { totalAmount, totalProfit, totalQuantity, count: todayRecords.length };
  }, [saleRecords]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>
          <p className="text-slate-500 mt-1">欢迎回来，今天是管理药店的好日子～</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <PackagePlus className="w-4 h-4" />
            快速入库
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

      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-1 rounded-full">
              {expiryStats.expired + expiryStats.urgent + expiryStats.warning} 种
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
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="font-semibold text-slate-800">即将过期药品</h3>
            </div>
            <Link
              to="/medicines"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-5">
            {expiryStats.expiringMedicines.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-slate-500">所有药品都在有效期内 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiryStats.expiringMedicines.slice(0, 5).map((med) => {
                  const days = getDaysUntilExpiry(med.expiryDate);
                  const status = getExpiryStatus(days);
                  return (
                    <div
                      key={med.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Pill className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{med.name}</p>
                          <p className="text-xs text-slate-500">
                            {med.category} · {med.specification}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getExpiryStatusColor(
                            status
                          )}`}
                        >
                          {getExpiryStatusText(status)}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          {days > 0 ? `还剩 ${days} 天` : `已过期 ${Math.abs(days)} 天`}
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
                  const status = getStockAlertStatus(med.stock, med.safetyStock);
                  return (
                    <div
                      key={med.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{med.name}</p>
                        <p className="text-xs text-slate-500">
                          安全库存: {med.safetyStock} 盒
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStockAlertColor(
                            status
                          )}`}
                        >
                          {getStockAlertStatusText(status)}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          当前库存: {med.stock} 盒
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Plus className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold mb-2">新增药品</h3>
          <p className="text-sm text-emerald-100 mb-4">
            添加新的药品信息，包括名称、规格、价格等
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
            药品到货后登记入库，更新库存数量
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
