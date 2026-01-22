import React from 'react';
import './HomePage.css';  // Import the CSS file to style the page

const HomePage = () => {
  return (
    <div className="home-page">
      <header className="header">
        <h2>Oussama Chahidi</h2>
        <p>oussama.chahidi@gmail.com</p>
        <div className="notifications">
          <span>2</span> {/* Notification count */}
        </div>
      </header>

      {/* Group Tasks Section */}
      <section className="group-tasks">
        <h3>Group tasks</h3>
        <div className="task">
          <h4>Design Meeting</h4>
          <p>Tomorrow | 10:30pm</p>
          <div className="team">
            {/* Insert team member images/icons */}
          </div>
        </div>
        <div className="task">
          <h4>Projects Meeting</h4>
          <p>Thursday | 10:30pm</p>
          <div className="team">
            {/* Insert team member images/icons */}
          </div>
        </div>
      </section>

      {/* Incomplete Tasks Section */}
      <section className="tasks incomplete-tasks">
        <h3>Incomplete Tasks</h3>
        <div className="task">
          <p>Client meeting</p>
          <p>Tomorrow | 10:30pm</p>
          <button>➡</button>
        </div>
        <div className="task">
          <p>Client meeting</p>
          <p>Tomorrow | 10:30pm</p>
          <button>➡</button>
        </div>
      </section>

      {/* Completed Tasks Section */}
      <section className="tasks completed-tasks">
        <h3>Completed Tasks</h3>
        <div className="task completed">
          <p>Client meeting</p>
          <p>Tomorrow | 10:30pm</p>
          <button>✔</button>
        </div>
        <div className="task completed">
          <p>Client meeting</p>
          <p>Tomorrow | 10:30pm</p>
          <button>✔</button>
        </div>
      </section>

      {/* Tabs Bar at the Bottom */}
      <footer className="tabs-bar">
        <div className="tab">
          <span>🏠</span>
        </div>
        <div className="tab">
          <span>⚙️</span>
        </div>
        <div className="tab">
          <span>📅</span>
        </div>
        <div className="tab">
          <span>📝</span>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
