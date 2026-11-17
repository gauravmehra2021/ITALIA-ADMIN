import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { AppRouter } from './routes/AppRouter';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
