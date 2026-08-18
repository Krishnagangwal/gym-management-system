import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div className="p-8 text-2xl font-bold">Gym Management System</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
