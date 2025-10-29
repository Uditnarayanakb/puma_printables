import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { NotificationsPage } from "./pages/NotificationsPage";

function App() {
  const { isAuthenticated, login, logout, token, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/orders" replace />
          ) : (
            <LoginPage onLogin={login} />
          )
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {token && user ? (
              <OrdersPage token={token} user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {token && user ? (
              <ProductsPage token={token} user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {token && user ? (
              <ReportsPage token={token} user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {token && user ? (
              <NotificationsPage token={token} user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? "/orders" : "/login"} replace />
        }
      />
    </Routes>
  );
}

export default App;
