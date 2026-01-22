import React from "react";
import {
  HiChevronLeft,
  HiOutlinePencilSquare,
  HiOutlineCheckCircle,
  HiOutlineTrash,
  HiOutlineMapPin
} from "react-icons/hi2";
import { Link } from "react-router-dom";
import TabBar from "../components/TabBar";

const TaskDetails: React.FC = () => {
  return (
    <div className="screen task-details">
      <div className="task-details__header">
        <Link to="/tasks" className="icon-link" aria-label="Back">
          <HiChevronLeft />
        </Link>
        <span>Task Details</span>
      </div>

      <div className="task-details__body">
        <div className="task-title">
          <h2>team meeting</h2>
          <HiOutlinePencilSquare />
        </div>
        <p className="task-meta">Today | 20:00pm</p>
        <div className="divider" />
        <p className="task-copy">
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the
          industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and
          scrambled it to make a type specimen book.
        </p>
      </div>

      <div className="task-actions">
        <button type="button" className="action-card action-card--success">
          <HiOutlineCheckCircle />
          Done
        </button>
        <button type="button" className="action-card action-card--danger">
          <HiOutlineTrash />
          Delete
        </button>
        <button type="button" className="action-card action-card--warn">
          <HiOutlineMapPin />
          Pin
        </button>
      </div>

      <TabBar />
    </div>
  );
};

export default TaskDetails;
