import React, { useEffect, useState } from "react";
import {
  HiChevronLeft,
  HiOutlineCheckCircle,
  HiOutlineTrash,
  HiOutlineMapPin
} from "react-icons/hi2";
import { Link, useNavigate, useParams } from "react-router-dom";
import TabBar from "../components/TabBar";
import { getTaskById, loadTasks, removeTask, updateTask, type Task } from "../services/tasks";
import { buildCalendarEventPayload } from "../services/taskSync";
import { deleteCalendarEvent, updateCalendarEvent } from "../services/googleCalendar";

const TaskDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "09:00"
  });
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!id) {
      setTask(null);
      setStatus(null);
      return;
    }
    const existing = getTaskById(id);
    if (existing) {
      setTask(existing);
      setStatus(null);
      setForm({
        title: existing.title,
        description: existing.description || "",
        dueDate: existing.dueDate,
        dueTime: existing.dueTime
      });
    } else {
      setTask(null);
      setStatus({ tone: "error", message: "Task not found." });
    }
  }, [id]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!task) {
      return;
    }
    if (!form.title.trim() || !form.dueDate || !form.dueTime) {
      setStatus({ tone: "error", message: "Add a title, date, and time." });
      return;
    }

    const updated: Task = {
      ...task,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate,
      dueTime: form.dueTime
    };

    const next = updateTask(loadTasks(), updated);
    setTask(updated);
    setStatus({ tone: "success", message: "Task updated." });

    if (updated.googleEventId) {
      try {
        await updateCalendarEvent(updated.googleEventId, buildCalendarEventPayload(updated));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update Google Calendar event.";
        setStatus({ tone: "error", message: `Saved locally. ${message}` });
      }
    }

    setTask(next.find((item) => item.id === updated.id) ?? updated);
  };

  const handleToggle = () => {
    if (!task) {
      return;
    }
    const updated: Task = { ...task, isCompleted: !task.isCompleted };
    updateTask(loadTasks(), updated);
    setTask(updated);
    setStatus({ tone: "success", message: updated.isCompleted ? "Marked as completed." : "Marked as pending." });
  };

  const handleDelete = async () => {
    if (!task) {
      return;
    }
    if (task.googleEventId) {
      try {
        await deleteCalendarEvent(task.googleEventId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to delete Google Calendar event.";
        setStatus({ tone: "error", message });
      }
    }
    removeTask(loadTasks(), task.id);
    navigate("/tasks");
  };

  return (
    <div className="screen task-details">
      <div className="task-details__header">
        <Link to="/tasks" className="icon-link" aria-label="Back">
          <HiChevronLeft />
        </Link>
        <span>Task Details</span>
      </div>

      <div className="task-details__body">
        {task ? (
          <>
            <label className="task-details__label">
              Title
              <input name="title" value={form.title} onChange={handleChange} />
            </label>
            <div className="inline-fields">
              <label className="task-details__label">
                Date
                <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} />
              </label>
              <label className="task-details__label">
                Time
                <input type="time" name="dueTime" value={form.dueTime} onChange={handleChange} />
              </label>
            </div>
            <label className="task-details__label">
              Description
              <textarea name="description" rows={5} value={form.description} onChange={handleChange} />
            </label>
            {status ? (
              <div className={`status-pill ${status.tone === "success" ? "status-pill--success" : "status-pill--error"}`}>
                {status.message}
              </div>
            ) : null}
            <button type="button" className="primary-btn" onClick={handleSave} disabled={!task}>
              Save changes
            </button>
          </>
        ) : (
          <p className="calendar-empty">Task not found.</p>
        )}
      </div>

      <div className="task-actions">
        <button type="button" className="action-card action-card--success" onClick={handleToggle} disabled={!task}>
          <HiOutlineCheckCircle />
          {task?.isCompleted ? "Undo" : "Done"}
        </button>
        <button type="button" className="action-card action-card--danger" onClick={handleDelete} disabled={!task}>
          <HiOutlineTrash />
          Delete
        </button>
        <button type="button" className="action-card action-card--warn" disabled={!task}>
          <HiOutlineMapPin />
          Pin
        </button>
      </div>

      <TabBar />
    </div>
  );
};

export default TaskDetails;
