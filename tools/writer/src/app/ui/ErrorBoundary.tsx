// Keeps one broken piece (a node view, a preview component) from taking the
// whole writer down. The draft itself lives in state and localStorage, so
// remounting the piece loses nothing.

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  /** Change it to reset the boundary (a new draft, a new preview body). */
  resetKey?: unknown;
  fallback(error: Error, reset: () => void): ReactNode;
  children: ReactNode;
};

type State = { error: Error | null; resetKey: unknown };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[writer]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}
