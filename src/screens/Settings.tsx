import React from "react";
import { HiChevronLeft, HiChevronRight, HiOutlineUser, HiOutlineChatBubbleLeftRight, HiOutlineLightBulb, HiOutlineDocumentText, HiArrowRightOnRectangle } from "react-icons/hi2";
import { Link } from "react-router-dom";
import TabBar from "../components/TabBar";

const Settings: React.FC = () => {
  const items = [
    { label: "Profile", icon: HiOutlineUser },
    { label: "Conversations", icon: HiOutlineChatBubbleLeftRight },
    { label: "Projects", icon: HiOutlineLightBulb },
    { label: "Terms and Policies", icon: HiOutlineDocumentText }
  ];

  return (
    <div className="screen settings">
      <div className="settings__header">
        <Link to="/home" className="icon-link" aria-label="Back">
          <HiChevronLeft />
        </Link>
        <h2>Settings</h2>
      </div>

      <div className="settings__list">
        {items.map((item) => (
          <button key={item.label} type="button" className="settings__item">
            <span className="settings__icon">
              <item.icon />
            </span>
            <span>{item.label}</span>
            <HiChevronRight />
          </button>
        ))}
      </div>

      <button type="button" className="logout-btn">
        <HiArrowRightOnRectangle />
        Logout
      </button>

      <TabBar />
    </div>
  );
};

export default Settings;
