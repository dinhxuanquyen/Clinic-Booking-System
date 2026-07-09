import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

export default function ManagementLayout() {
  return (
    <div className="management-layout">
      <Navbar />
      <Outlet />
    </div>
  );
}
