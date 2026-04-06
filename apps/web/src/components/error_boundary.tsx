import type { ReactNode } from "react";
import { Component } from "react";

type ErrorBoundaryProps = {
  boundaryKey: string;
  children: ReactNode;
  fallback: ReactNode | ((params: { error: Error; reset: () => void }) => ReactNode);
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Catches render-time failures from Relay and route content so small network or query errors can
 * degrade locally instead of bubbling all the way up to the router catch boundary.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      error,
    };
  }

  override componentDidUpdate(previousProps: Readonly<ErrorBoundaryProps>): void {
    if (previousProps.boundaryKey !== this.props.boundaryKey && this.state.error) {
      this.setState({
        error: null,
      });
    }
  }

  private readonly handleReset = () => {
    this.setState({
      error: null,
    });
  };

  override render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    if (typeof this.props.fallback === "function") {
      return this.props.fallback({
        error: this.state.error,
        reset: this.handleReset,
      });
    }

    return this.props.fallback;
  }
}
