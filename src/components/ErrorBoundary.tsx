import * as React from "react";
import { Errors } from '../services/Errors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Errors.log(error, info);
    this.setState({
      hasError: true,
    });
  }

  render() {
    return this.state.hasError ? (
      <div>Something went wrong.</div>
    ) : (
      this.props.children
    );
  }
}

export { ErrorBoundary };
