import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { HiChevronRight, HiBell } from "react-icons/hi2";
import { Link } from "react-router-dom";
import TabBar from "../components/TabBar";
import { auth } from "../services/firebase";

const Home: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });
    return () => unsubscribe();
  }, []);

  const displayName = user?.displayName || "Guest";
  const email = user?.email || "guest@example.com";
  const photoUrl = user?.photoURL || "";
  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "G";
    }
    return parts
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [displayName]);

  return (
    <div className="screen home">
      <div className="home__header">
        <div className="profile-chip">
          <div className="profile-avatar">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} />
            ) : (
              <span className="avatar-initials">{initials}</span>
            )}
            <div className="avatar-ring" />
          </div>
          <div>
            <h2>{displayName}</h2>
            <p>{email}</p>
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
