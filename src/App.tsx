import React from 'react';
import ErrorBoundary from './ErrorBoundary';  // Import the ErrorBoundary component
import HomePage from './components/HomePage'; // Import your main component (or other components you need)

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HomePage />  {/* Your main component(s) here */}
    </ErrorBoundary>
  );
};

export default App;
