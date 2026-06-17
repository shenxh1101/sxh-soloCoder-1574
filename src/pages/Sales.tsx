import { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Pill,
  Trophy,
  BarChart3,
  Layers,
  Calendar,
  Tag,
  Building2,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { MEDICINE_CATEGORIES } from '@/types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@/utils';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export function Sales() {
  const { medicines, saleRecords, batches, suppliers } = useAppStore();

  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  const filteredSales = useMemo(() => {
    let result = [...saleRecords];

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((s) => new Date(s.saleTime) >= start);
    } else {
      const now = new Date();
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 36500;
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter((s) => new Date(s.saleTime) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.saleTime) <= end);
    }

    if (selectedCategory !== 'all') {
      result = result.filter((s) => {
        const med = medicines.find((m) => m.id === s.medicineId);
        return med?.category === selectedCategory;
      });
    }

    if (selectedSupplier !== 'all') {
      result = result.filter((s) => {
        const med = medicines.find((m) => m.id === s.medicineId);
        return med?.supplierId === selectedSupplier;
      });
    }

    return result;
  }, [saleRecords, range, startDate, endDate, selectedCategory, selectedSupplier, medicines]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce(
      (sum, s) => sum + s.totalAmount,
      0
    );
    const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const totalQty = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
    const totalFreeQty = filteredSales.reduce(
      (sum, s) => sum + (s.freeQuantity || 0),
      0
    );
    const totalOrders = filteredSales.length;
    return { totalRevenue, totalProfit, totalQty, totalFreeQty, totalOrders };
  }, [filteredSales]);

  const salesByMedicine = useMemo(() => {
    const map = new Map<
      string,
      {
        medicineId: string;
        name: string;
        quantity: number;
        freeQuantity: number;
        revenue: number;
        profit: number;
      }
    >();

    filteredSales.forEach((sale) => {
      const med = medicines.find((m) => m.id === sale.medicineId);
      if (!med) return;
      const existing = map.get(sale.medicineId) || {
        medicineId: sale.medicineId,
        name: med.name,
        quantity: 0,
        freeQuantity: 0,
        revenue: 0,
        profit: 0,
      };
      existing.quantity += sale.quantity;
      existing.freeQuantity += sale.freeQuantity || 0;
      existing.revenue += sale.totalAmount;
      existing.profit += sale.profit || 0;
      map.set(sale.medicineId, existing);
    });

    return Array.from(map.values());
  }, [filteredSales, medicines]);

  const topByQuantity = useMemo(
    () => [...salesByMedicine].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    [salesByMedicine]
  );

  const topByProfit = useMemo(
    () => [...salesByMedicine].sort((a, b) => b.profit - a.profit).slice(0, 5),
    [salesByMedicine]
  );

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; profit: number }>();
    filteredSales.forEach((sale) => {
      const date = formatDate(sale.saleTime);
      const existing = map.get(date) || { date, revenue: 0, profit: 0 };
      existing.revenue += sale.totalAmount;
      existing.profit += sale.profit || 0;
      map.set(date, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  const categoryStats = useMemo(() => {
    const map = new Map<
      string,
      {
        category: string;
        quantity: number;
        freeQuantity: number;
        revenue: number;
        profit: number;
      }
    >();

    filteredSales.forEach((sale) => {
      const med = medicines.find((m) => m.id === sale.medicineId);
      if (!med) return;
      const category = med.category;
      const existing = map.get(category) || {
        category,
        quantity: 0,
        freeQuantity: 0,
        revenue: 0,
        profit: 0,
      };
      existing.quantity += sale.quantity;
      existing.freeQuantity += sale.freeQuantity || 0;
      existing.revenue += sale.totalAmount;
      existing.profit += sale.profit || 0;
      map.set(category, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, medicines]);

  const recentSales = useMemo(
    () =>
      [...filteredSales]
        .sort(
          (a, b) =>
            new Date(b.saleTime).getTime() - new Date(a.saleTime).getTime()
        )
        .slice(0, 20),
    [filteredSales]
  );

  const getMedicineName = (id: string) =>
    medicines.find((m) => m.id === id)?.name || '-';

  const getBatchNo = (batchId?: string) => {
    if (!batchId) return '-';
    return batches.find((b) => b.id === batchId)?.batchNo || '-';
  };

  const maxBarQty = topByQuantity.length > 0 ? topByQuantity[0].quantity : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">销售统计</h1>
          <p className="text-slate-500 mt-1">查看销量排行和利润分析</p>
        </div>
        <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
          {(['7d', '30d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                setStartDate('');
                setEndDate('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                range === r && !startDate && !endDate
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r === '7d' ? '近7天' : r === '30d' ? '近30天' : '全部'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">日期范围</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <span className="text-slate-400">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="w-px h-8 bg-slate-200" />

          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">药品分类</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="all">全部</option>
              {MEDICINE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-8 bg-slate-200" />

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">供货商</span>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="all">全部</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          {(startDate || endDate || selectedCategory !== 'all' || selectedSupplier !== 'all') && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedCategory('all');
                setSelectedSupplier('all');
                setRange('30d');
              }}
              className="ml-auto text-sm text-slate-500 hover:text-emerald-600 transition-colors"
            >
              重置筛选
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总销售额</p>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-sky-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">总利润</p>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(stats.totalProfit)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">
                销售盒数
                {stats.totalFreeQty > 0 && (
                  <span className="ml-1 text-[10px] text-violet-500">
                    含赠送 {stats.totalFreeQty}
                  </span>
                )}
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.totalQty + stats.totalFreeQty}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-500">交易笔数</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats.totalOrders}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4">分类统计</h2>
        {categoryStats.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm">
            暂无数据
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoryStats.map((item) => (
              <div
                key={item.category}
                className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Tag className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">
                    {item.category}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">销售盒数</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {item.quantity + item.freeQuantity}
                      {item.freeQuantity > 0 && (
                        <span className="text-[10px] text-violet-500 ml-1">
                          赠{item.freeQuantity}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">实收金额</span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">毛利</span>
                    <span className="text-sm font-semibold text-sky-600">
                      {formatCurrency(item.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">赠品盒数</span>
                    <span className="text-sm font-semibold text-violet-600">
                      {item.freeQuantity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4">销售趋势</h2>
        <div className="h-64">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              暂无销售数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `¥${v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'revenue' ? '销售额' : '利润',
                  ]}
                />
                <Bar
                  dataKey="revenue"
                  name="销售额"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  name="利润"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-800">销量排行 TOP 5</h2>
          </div>
          <div className="space-y-3">
            {topByQuantity.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">
                暂无数据
              </p>
            ) : (
              topByQuantity.map((item, idx) => (
                <div key={item.medicineId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-700'
                            : idx === 1
                            ? 'bg-slate-100 text-slate-600'
                            : idx === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-800">
                        {item.quantity + item.freeQuantity} 盒
                      </span>
                      {item.freeQuantity > 0 && (
                        <span className="text-[10px] text-violet-500 ml-1.5">
                          赠{item.freeQuantity}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden ml-7">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${((item.quantity + item.freeQuantity) / maxBarQty) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-slate-800">利润排行 TOP 5</h2>
          </div>
          <div className="space-y-3">
            {topByProfit.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">
                暂无数据
              </p>
            ) : (
              topByProfit.map((item, idx) => (
                <div key={item.medicineId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
                          idx === 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : idx === 1
                            ? 'bg-slate-100 text-slate-600'
                            : idx === 2
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(item.profit)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden ml-7">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.profit / (topByProfit[0]?.profit || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">最近销售记录</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  药品
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  批次
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  数量
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  单价
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  实收金额
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  利润
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-slate-400 text-sm"
                  >
                    暂无销售记录
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                          <Pill className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="font-medium text-slate-800 text-sm">
                          {getMedicineName(sale.medicineId)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Layers className="w-3 h-3" />
                        {getBatchNo(sale.batchId)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-medium text-slate-800">
                        {sale.quantity}
                      </span>
                      {sale.freeQuantity > 0 && (
                        <span className="text-xs text-violet-500 ml-1.5">
                          (+{sale.freeQuantity}赠)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-slate-600">
                      {formatCurrency(sale.unitPrice)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-slate-800">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-emerald-600">
                      {formatCurrency(sale.profit || 0)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {formatDateTime(sale.saleTime)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
