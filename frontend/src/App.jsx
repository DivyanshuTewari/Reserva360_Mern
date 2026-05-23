import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import MasterLogin from './pages/MasterLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import MasterDashboard from './pages/MasterDashboard';
import ProtectedRoute from './components/ProtectedRoute';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
          <Toaster position="bottom-right" toastOptions={{
            style: {
              background: '#13151a',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }} />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/master-secure-login" element={<MasterLogin />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/*" element={<AdminDashboard />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['user', 'staff']} />}>
              <Route path="/staff/*" element={<UserDashboard />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['master']} />}>
              <Route path="/master/*" element={<MasterDashboard />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
