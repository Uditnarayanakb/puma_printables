import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { CartProvider } from "./hooks/useCart";
import { LoginPage } from "./pages/LoginPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { RegisterPage } from "./pages/RegisterPage";

function App() {
  const { isAuthenticated, login, logout, token, user, refreshSession } =
    useAuth();

  return (
    <CartProvider token={token ?? null}>
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
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/orders" replace />
            ) : (
              <RegisterPage onLogin={login} />
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
                <NotificationsPage
                  token={token}
                  user={user}
                  onLogout={logout}
                />
              ) : (
                <Navigate to="/login" replace />
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {token && user ? (
                user.role === "ADMIN" ? (
                  <AdminUsersPage
                    token={token}
                    user={user}
                    onLogout={logout}
                    onSessionRefresh={refreshSession}
                  />
                ) : (
                  <Navigate to="/orders" replace />
                )
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
    </CartProvider>
  );
}

export default App;
