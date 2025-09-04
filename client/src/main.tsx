import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// EMERGENCY FIX: Disable React.StrictMode to prevent infinite loops
// React 18 StrictMode executes effects twice in development, causing cascading loops
// This is a temporary fix until all useEffect dependencies are stabilized
createRoot(document.getElementById("root")!).render(<App />);
