import React, { useState } from "react";
import { HiMagnifyingGlass, HiChevronDown, HiPlus, HiChevronRight } from "react-icons/hi2";
import { Link } from "react-router-dom";
import TabBar from "../components/TabBar";

const Tasks: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="screen tasks">
      <div className="tasks__header">
        <label className="search-field">
          <HiMagnifyingGlass />
          <input type="text" placeholder="Search by task title" />
        </label>
        <button className="sort-btn" type="button">
          <span>Sort By:</span>
          <HiChevronDown />
        </button>
      </div>

      <h2 className="section-title">Tasks List</h2>

      <Link to="/tasks/1" className="task-row">
        <div>
          <h4>Client meeting</h4>
          <p>Tomorrow | 10:30pm</p>
        </div>
        <HiChevronRight />
      </Link>
      <Link to="/tasks/2" className="task-row">
        <div>
          <h4>Client meeting</h4>
          <p>Tomorrow | 10:30pm</p>
        </div>
        <HiChevronRight />
      </Link>
      <Link to="/tasks/3" className="task-row">
        <div>
          <h4>Client meeting</h4>
          <p>Tomorrow | 10:30pm</p>
        </div>
        <HiChevronRight />
      </Link>
      <Link to="/tasks/4" className="task-row">
        <div>
          <h4>Client meeting</h4>
          <p>Tomorrow | 10:30pm</p>
        </div>
        <HiChevronRight />
      </Link>

      <button className="fab" type="button" onClick={() => setIsModalOpen(true)} aria-label="Create task">
        <HiPlus />
      </button>

      <TabBar />

      {isModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card modal-card--form">
            <label className="input-field input-field--dark">
              <span className="input-icon">
                <HiPlus />
              </span>
              <input type="text" placeholder="task" />
            </label>
            <label className="input-field input-field--dark input-field--textarea">
              <span className="input-icon">
                <span className="bars-icon" aria-hidden="true" />
              </span>
              <textarea placeholder="Description" rows={4} />
            </label>
            <div className="inline-fields">
              <button type="button" className="ghost-btn">
                Date
              </button>
              <button type="button" className="ghost-btn">
                Time
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>
                cancel
              </button>
              <button type="button" className="primary-btn" onClick={() => setIsModalOpen(false)}>
                create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Tasks;
