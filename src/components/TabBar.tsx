import React from "react";
import { NavLink } from "react-router-dom";
import { HiHome, HiOutlineClipboardDocumentList, HiOutlineCalendarDays, HiOutlineCog6Tooth } from "react-icons/hi2";

const TabBar: React.FC = () => {
  const tabs = [
    { to: "/home", label: "Home", Icon: HiHome },
    { to: "/tasks", label: "Tasks", Icon: HiOutlineClipboardDocumentList },
    { to: "/calendar", label: "Calendar", Icon: HiOutlineCalendarDays },
    { to: "/settings", label: "Settings", Icon: HiOutlineCog6Tooth }
  ];

  return (
    <nav className="tabbar" aria-label="Primary">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `tabbar__link${isActive ? " tabbar__link--active" : ""}`}
          aria-label={label}
        >
          <Icon aria-hidden="true" />
          <span className="tabbar__dot" />
        </NavLink>
      ))}
    </nav>
  );
};

export default TabBar;
