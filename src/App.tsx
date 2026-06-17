import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ToastContainer } from '@/components/Toast';
import { Dashboard } from '@/pages/Dashboard';
import { Medicines } from '@/pages/Medicines';
import { Inventory } from '@/pages/Inventory';
import { Sales } from '@/pages/Sales';
import { Promotions } from '@/pages/Promotions';
import { Suppliers } from '@/pages/Suppliers';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/suppliers" element={<Suppliers />} />
        </Route>
      </Routes>
      <ToastContainer />
    </Router>
  );
}
