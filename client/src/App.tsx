import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Scan from "./pages/Scan";
import JoinLink from "./pages/JoinLink";
import Home from "./pages/Home";
import GestureTest from "./pages/GestureTest";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/join/:roomCode" element={<JoinLink />} />
      <Route path="/room/:roomCode" element={<Home />} />
      <Route path="/gesture-test" element={<GestureTest />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
