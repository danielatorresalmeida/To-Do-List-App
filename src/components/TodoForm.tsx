import React, { useState } from 'react';

interface TodoFormProps {
  onAdd: (text: string, category: string, date: string) => void;
}

const TodoForm: React.FC<TodoFormProps> = ({ onAdd }) => {
  const [formData, setFormData] = useState({
    taskText: "",
    category: "",
    date: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);  // State to control success modal visibility

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { taskText, category, date } = formData;

    // Validation check
    if (!taskText.trim() || !category.trim() || !date) {
      setError("Please fill in all the fields.");
      return;
    }

    // Call onAdd prop to add the task
    onAdd(taskText, category, date);

    // Reset form and show success modal
    setFormData({ taskText: "", category: "", date: "" });
    setError(null);
    setShowModal(true);

    // Hide modal after 2 seconds
    setTimeout(() => setShowModal(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="todo-form">
      {error && <div className="error-message">{error}</div>}

      <input
        type="text"
        name="taskText"
        value={formData.taskText}
        onChange={handleChange}
        placeholder="Task Name"
        className="task-input"
      />
      <input
        type="text"
        name="category"
        value={formData.category}
        onChange={handleChange}
        placeholder="Category"
        className="category-input"
      />
      <input
        type="date"
        name="date"
        value={formData.date}
        onChange={handleChange}
        className="date-input"
      />
      <button type="submit" className="add-button" disabled={!formData.taskText || !formData.category || !formData.date}>Add</button>

      {showModal && <div className="modal">Task Added!</div>}
    </form>
  );
};

export default TodoForm;
