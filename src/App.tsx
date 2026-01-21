import React, { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    this.setState({ errorMessage: error.toString() });
  }

  render() {
    if (this.state.hasError) {
      return <h1>Error: {this.state.errorMessage}</h1>;
    }
    return this.props.children;
  }
}

// Usage in App.tsx
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      {/* Your existing code */}
    </ErrorBoundary>
  );
};

export default App;
