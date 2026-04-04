import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Interests from "./pages/Interests";
import MainLayout from "./pages/MainLayout";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/interests" element={<Interests />} />

        {/* MAIN APP */}
        <Route path="/app" element={<MainLayout />}>
          <Route path="chat" element={<Chat />} />
        </Route>

        {/* STANDALONE PROFILE PAGE */}
        <Route path="/profile" element={<Profile />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;