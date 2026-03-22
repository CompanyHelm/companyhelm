import "./App.css";
import { ApplicationHeader } from "./compoments/application_header/application_header";
import { ApplicationRouter } from "./compoments/application_router/application_router";
import { config } from "./config";

export default function App() {
  return (
    <div className={`app-shell app-shell--${config.authProvider}`}>
      <ApplicationHeader />
      <div className="app-content">
        <ApplicationRouter />
      </div>
    </div>
  );
}
