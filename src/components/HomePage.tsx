import React from 'react';
import TodoList from './TodoList'; // Assuming TodoList displays all tasks
import TodoForm from './TodoForm'; // Assuming TodoForm handles task creation

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <header className="home-header">
        <h1>To-Do List</h1>
        <p>Welcome back! Here's your list of tasks</p>
      </header>

      {/* Task Overview */}
      <div className="task-overview">
        <div className="task-overview-card">
          <h3>Incomplete Tasks</h3>
          <TodoList status="incomplete" />
        </div>
        <div className="task-overview-card">
          <h3>Completed Tasks</h3>
          <TodoList status="completed" />
        </div>
      </div>

      {/* Task Creation Form */}
      <div className="add-task-section">
        <TodoForm />
      </div>
    </div>
  );
};

export default HomePage;
