import React, { useState, useEffect } from "react";
import { loadTasks, removeTask, type Task } from "../services/tasks";

interface TodoListProps {
  taskStatus: "incomplete" | "completed"; // Make the status prop more specific
}

const TodoList: React.FC<TodoListProps> = ({ taskStatus }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(loadTasks());
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
            <span>{task.title}</span> <span>({task.category || "General"})</span>
            <button onClick={() => handleDelete(task.id)}>Delete</button>
          </div>
        ))
      )}
    </div>
  );

  // Handle task deletion
  function handleDelete(taskId: string) {
    const updatedTasks = removeTask(tasks, taskId);
    setTasks(updatedTasks);
  }
};

export default TodoList;
