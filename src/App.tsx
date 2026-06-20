import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GNB } from "./components/GNB";
import { Home } from "./pages/Home";
import { DeliveryPage } from "./pages/delivery/DeliveryPage";

function App() {
  return (
    <BrowserRouter>
      <GNB />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/delivery" element={<DeliveryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
