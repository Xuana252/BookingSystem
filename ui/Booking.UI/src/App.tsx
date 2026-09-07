import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthWatcher } from "./components/AuthWatcher";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { CreateRoomPage } from "./pages/CreateRoomPage";
import { CreateUserPage } from "./pages/CreateUserPage";
import { ManageRoomsPage } from "./pages/ManageRoomsPage";
import { ManageUsersPage } from "./pages/ManageUsersPage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthWatcher />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/rooms/new" element={<CreateRoomPage />} />
            <Route path="/admin/rooms" element={<ManageRoomsPage />} />
            <Route path="/admin/rooms/new" element={<CreateRoomPage />} />
            <Route path="/admin/users" element={<ManageUsersPage />} />
            <Route path="/admin/users/new" element={<CreateUserPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
