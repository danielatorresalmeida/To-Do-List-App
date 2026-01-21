import React from "react";
import { FaCheckCircle, FaTrashAlt } from "react-icons/fa";

interface TodoItemProps {
  text: string;
  category: string;
  isCompleted: boolean;
  date: string;
  onDelete: () => void;
  onToggle: () => void;
}

const TodoItem: React.FC<TodoItemProps> = ({
  text,
  category,
  isCompleted,
  date,
  onDelete,
  onToggle,
}) => {
  return (
    <div className="task-item">
      <div className={`task-text ${isCompleted ? "completed-text" : "pending-text"}`}>
        {text}
        <span className="task-date">{date}</span>
      </div>

      <span className={isCompleted ? "status-completed" : "status-pending"}>
        {isCompleted ? "Completed" : "Pending"}
      </span>

      {/* Toggle completion button */}
      <button
        onClick={onToggle}
        aria-label={isCompleted ? "Mark as Pending" : "Mark as Completed"}
        className={`toggle-btn ${isCompleted ? "completed" : "pending"}`}
      >
        <FaCheckCircle color={isCompleted ? "green" : "orange"} />
      </button>

      {/* Delete button */}
      <button
        onClick={onDelete}
        aria-label="Delete Task"
        className="delete-btn"
      >
        <FaTrashAlt color="red" />
      </button>
    </div>
  );
};

export default TodoItem;
