// src/App.tsx
import React from 'react';
import TodoList from './components/TodoList';
import './styles/styles.css'; // or a specific CSS module if preferred

const App = () => {
  return (
    <div>
      <h1>My To-Do List</h1>
      <TodoList />
    </div>
  );
};

export default App;
