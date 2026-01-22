import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Verification: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleVerify = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowModal(true);
    window.setTimeout(() => {
      setShowModal(false);
      navigate("/home");
    }, 1400);
  };

  return (
    <div className="screen verification">
      <h1 className="screen-title">Verify account</h1>
      <div className="verify-card">
        <div className="brand-name brand-name--small">DO IT</div>
        <p>
          By verifying your account, your data will be secured and you accept our terms and policies.
        </p>
        <form onSubmit={handleVerify} className="verify-form">
          <input
            type="text"
            placeholder="Verification code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
          <button type="submit" className="primary-btn">
            Verify
          </button>
        </form>
      </div>

      {showModal ? (
        <div className="modal-overlay" role="status" aria-live="polite">
          <div className="modal-card">
            <div className="modal-icon modal-icon--success" />
            <p>example2023@gmail.com is verified</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Verification;
