import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AdminRoute = () => {
  const { isAuthenticated, user } = useAuth();
  return isAuthenticated && user?.role === 'admin'
    ? <Outlet />
    : <Navigate to="/dashboard" replace />;
};

export default AdminRoute;
