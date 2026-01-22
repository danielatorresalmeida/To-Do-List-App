import React from "react";
import { HiChevronRight, HiBell } from "react-icons/hi2";
import { Link } from "react-router-dom";
import TabBar from "../components/TabBar";

const Home: React.FC = () => {
  return (
    <div className="screen home">
      <div className="home__header">
        <div className="profile-chip">
          <div className="profile-avatar">
            <div className="avatar-ring" />
          </div>
          <div>
            <h2>oussama chahidi</h2>
            <p>oussama.chahidi@gmail.com</p>
          </div>
        </div>
        <div className="notif">
          <HiBell />
          <span className="notif__count">2</span>
        </div>
      </div>

      <section className="home__section">
        <h3>Group tasks</h3>
        <div className="card card--soft">
          <div>
            <h4>Design Meeting</h4>
            <p>Tomorrow | 10:30pm</p>
            <div className="avatar-stack">
              <span className="avatar-dot" />
              <span className="avatar-dot" />
              <span className="avatar-dot avatar-dot--ghost">+</span>
            </div>
          </div>
        </div>
        <div className="card card--soft">
          <div>
            <h4>Projects Meeting</h4>
            <p>Thursday | 10:30pm</p>
            <div className="avatar-stack">
              <span className="avatar-dot" />
              <span className="avatar-dot" />
              <span className="avatar-dot avatar-dot--ghost">+</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home__section">
        <h3>Incomplete Tasks</h3>
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
      </section>

      <section className="home__section home__section--last">
        <h3>Completed Tasks</h3>
        <Link to="/tasks/3" className="task-row task-row--done">
          <div>
            <h4>Client meeting</h4>
            <p>Tomorrow | 10:30pm</p>
          </div>
          <HiChevronRight />
        </Link>
        <Link to="/tasks/4" className="task-row task-row--done">
          <div>
            <h4>Client meeting</h4>
            <p>Tomorrow | 10:30pm</p>
          </div>
          <HiChevronRight />
        </Link>
      </section>

      <TabBar />
    </div>
  );
};

export default Home;
