import React, { useState, useEffect } from 'react';

interface Task {
  id: number;
  text: string;
  isCompleted: boolean;
  category: string;
}

interface TodoListProps {
  taskStatus: "incomplete" | "completed"; // Make the status prop more specific
}

const TodoList: React.FC<TodoListProps> = ({ taskStatus }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Get tasks from localStorage and parse them
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      const parsedTasks: Task[] = JSON.parse(savedTasks);
      setTasks(parsedTasks);
    }
  }, []);

  // Filter tasks based on the status
  const filteredTasks = tasks.filter((task) =>
    taskStatus === "completed" ? task.isCompleted : !task.isCompleted
  );

  return (
    <div>
      <h3>{taskStatus === "completed" ? "Completed Tasks" : "Incomplete Tasks"}</h3>
      {filteredTasks.length === 0 ? (
        <p>No tasks to display.</p>
      ) : (
        filteredTasks.map((task) => (
          <div key={task.id} className="task-item">
            <span>{task.text}</span> <span>({task.category})</span>
            <button onClick={() => handleDelete(task.id)}>Delete</button> {/* Add a delete button */}
          </div>
        ))
      )}
    </div>
  );

  // Handle task deletion
  function handleDelete(taskId: number) {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  }
};

export default TodoList;
