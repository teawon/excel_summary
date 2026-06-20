import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GNB } from "./components/GNB";
import { Home } from "./pages/Home";
import { DeliveryPage } from "./pages/delivery/DeliveryPage";
import { IncomingPage } from "./pages/incoming/IncomingPage";

function App() {
  return (
    <BrowserRouter>
      <GNB />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/incoming" element={<IncomingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
