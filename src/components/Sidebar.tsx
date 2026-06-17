import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  Package,
  BarChart3,
  Tag,
  Building2,
  Stethoscope,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/medicines', label: '药品管理', icon: Pill },
  { path: '/inventory', label: '库存管理', icon: Package },
  { path: '/sales', label: '销售统计', icon: BarChart3 },
  { path: '/promotions', label: '促销活动', icon: Tag },
  { path: '/suppliers', label: '供货商管理', icon: Building2 },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">药店管家</h1>
            <p className="text-xs text-slate-500">智能库存管理系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-xs text-emerald-700 font-medium mb-1">💡 今日提示</p>
          <p className="text-xs text-emerald-600">
            定期检查药品有效期，提前一个月处理临期药品哦～
          </p>
        </div>
      </div>
    </aside>
  );
}
