import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import AppFrame from "./components/AppFrame";
import SplashScreen from "./screens/SplashScreen";
import Onboarding from "./screens/Onboarding";
import SignIn from "./screens/SignIn";
import SignUp from "./screens/SignUp";
import Verification from "./screens/Verification";
import Home from "./screens/Home";
import Tasks from "./screens/Tasks";
import TaskDetails from "./screens/TaskDetails";
import Settings from "./screens/Settings";
import Calendar from "./screens/Calendar";

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppFrame>
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/verify" element={<Verification />} />
            <Route path="/home" element={<Home />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetails />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppFrame>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
