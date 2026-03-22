import "./App.css";
import { ClerkHeader } from "./components/clerk/header";
import { ApplicationRouter } from "./components/router/application_router";

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
