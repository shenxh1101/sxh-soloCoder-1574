import { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Trophy,
  Medal,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAppStore } from '@/store';
import { formatCurrency, formatDate, isDateInRange, getDateDaysAgo } from '@/utils';

type SortBy = 'quantity' | 'profit' | 'amount';
type TimeRange = '7days' | '30days' | 'all';

export function Sales() {
  const { saleRecords, medicines } = useAppStore();

  const [sortBy, setSortBy] = useState<SortBy>('quantity');
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');

  const startDate = useMemo(() => {
    if (timeRange === '7days') return getDateDaysAgo(7);
    if (timeRange === '30days') return getDateDaysAgo(30);
    return '2000-01-01';
  }, [timeRange]);

  const filteredRecords = useMemo(() => {
    const endDate = formatDate(new Date());
    return saleRecords.filter((r) => isDateInRange(r.saleTime, startDate, endDate));
  }, [saleRecords, startDate]);

  const stats = useMemo(() => {
    const totalAmount = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalProfit = filteredRecords.reduce((sum, r) => sum + r.profit, 0);
    const totalQuantity = filteredRecords.reduce((sum, r) => sum + r.quantity, 0);
    const orderCount = filteredRecords.length;

    return { totalAmount, totalProfit, totalQuantity, orderCount };
  }, [filteredRecords]);

  const salesByMedicine = useMemo(() => {
    const map = new Map<string, { quantity: number; amount: number; profit: number }>();

    filteredRecords.forEach((record) => {
      const existing = map.get(record.medicineId);
      if (existing) {
        existing.quantity += record.quantity;
        existing.amount += record.totalAmount;
        existing.profit += record.profit;
      } else {
        map.set(record.medicineId, {
          quantity: record.quantity,
          amount: record.totalAmount,
          profit: record.profit,
        });
      }
    });

    const result = Array.from(map.entries()).map(([medicineId, data]) => {
      const medicine = medicines.find((m) => m.id === medicineId);
      return {
        medicineId,
        name: medicine?.name || '未知药品',
        category: medicine?.category || '',
        ...data,
      };
    });

    if (sortBy === 'quantity') {
      result.sort((a, b) => b.quantity - a.quantity);
    } else if (sortBy === 'profit') {
      result.sort((a, b) => b.profit - a.profit);
    } else {
      result.sort((a, b) => b.amount - a.amount);
    }

    return result;
  }, [filteredRecords, medicines, sortBy]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, { amount: number; profit: number }>();

    filteredRecords.forEach((record) => {
      const date = formatDate(record.saleTime);
      const existing = map.get(date);
      if (existing) {
        existing.amount += record.totalAmount;
        existing.profit += record.profit;
      } else {
        map.set(date, { amount: record.totalAmount, profit: record.profit });
      }
    });

    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 30;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = getDateDaysAgo(i);
      const data = map.get(date) || { amount: 0, profit: 0 };
      result.push({
        date: date.slice(5),
        amount: parseFloat(data.amount.toFixed(2)),
        profit: parseFloat(data.profit.toFixed(2)),
      });
    }

    return result;
  }, [filteredRecords, timeRange]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-slate-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-700" />;
    return (
      <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-slate-400">
        {index + 1}
      </span>
    );
  };

  const barColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">销售统计</h1>
          <p className="text-slate-500 mt-1">查看销售数据和经营分析</p>
        </div>
        <div className="flex gap-2">
          {(['7days', '30days', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {range === '7days' ? '近7天' : range === '30days' ? '近30天' : '全部'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-slate-500">销售额</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {formatCurrency(stats.totalAmount)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-sky-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-slate-500">利润</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {formatCurrency(stats.totalProfit)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-slate-500">销售数量</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {stats.totalQuantity} 件
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-violet-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-slate-500">订单数</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.orderCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">销售趋势</h3>
        </div>
        <div className="p-5 h-72">
          {dailyTrend.every((d) => d.amount === 0) ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">暂无销售数据</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
                />
                <Bar dataKey="amount" name="销售额" radius={[6, 6, 0, 0]}>
                  {dailyTrend.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#10B981" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">药品排行榜</h3>
          <div className="flex gap-2">
            {(['quantity', 'profit', 'amount'] as SortBy[]).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  sortBy === sort
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sort === 'quantity' ? '销量' : sort === 'profit' ? '利润' : '销售额'}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {salesByMedicine.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">暂无销售排行数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {salesByMedicine.slice(0, 10).map((item, index) => {
                const maxValue = salesByMedicine[0]?.[sortBy] || 1;
                const percentage = (item[sortBy] / maxValue) * 100;
                return (
                  <div
                    key={item.medicineId}
                    className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-8 flex-shrink-0">{getRankIcon(index)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-800 text-sm truncate">
                          {item.name}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">
                          {sortBy === 'quantity'
                            ? `${item.quantity} 件`
                            : formatCurrency(sortBy === 'profit' ? item.profit : item.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: barColors[index % barColors.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
