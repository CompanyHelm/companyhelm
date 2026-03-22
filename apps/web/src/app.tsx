import "./App.css";
import { ClerkHeader } from "./auth/clerk/header";
import { ApplicationRouter } from "./compoments/application_router/application_router";

export default function App() {
  return (
    <div className="app-shell">
      <ClerkHeader />
      <div className="app-content">
        <ApplicationRouter />
      </div>
    </div>
  );
}
