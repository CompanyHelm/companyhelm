import { Button } from "@/components/ui/button";

export function ApplicationHeader() {
  return (
    <header className="app-header">
      <div className="app-header__copy">
        <p className="app-header__eyebrow">Home / Dashboard</p>
        <h1 className="app-header__title">Documents</h1>
      </div>

      <div className="app-header__actions">
        <Button
          className="app-header__github"
          variant="ghost"
          onClick={() => {
            window.open(
              "https://ui.shadcn.com/blocks?category=dashboard",
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          GitHub
        </Button>
      </div>
    </header>
  );
}
