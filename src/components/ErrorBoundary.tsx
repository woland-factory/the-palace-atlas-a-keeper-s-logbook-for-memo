import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

// App-level guard. Renders a calm, plain-voice fallback instead of a blank
// page or a raw stack trace. Never prints error contents to the user.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Left to Sentry (when configured). No PII is logged here.
    void error;
    void info;
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback" role="alert">
          <h1>The atlas hit a snag</h1>
          <p>Your saved palaces are safe. Reload to pick up where you left off.</p>
          <button className="btn btn--primary" onClick={this.handleReload}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
