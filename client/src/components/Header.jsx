import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="h-14 bg-white border-b flex items-center justify-end px-6">
      <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-red-600">
        Log Out
      </button>
    </header>
  );
}
