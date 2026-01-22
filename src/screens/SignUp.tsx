import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiEnvelope, HiLockClosed, HiUser } from "react-icons/hi2";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { signUpWithEmail, signInWithGoogle } from "../services/auth";
import LogoMark from "../components/LogoMark";

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsBusy(true);
    try {
      await signUpWithEmail(form.email, form.password);
      setShowModal(true);
      window.setTimeout(() => {
        setShowModal(false);
        navigate("/verify");
      }, 1400);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign up.";
      setStatus({ tone: "error", message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogle = async () => {
    setStatus(null);
    setIsBusy(true);
    try {
      await signInWithGoogle();
      setStatus({ tone: "success", message: "Account connected with Google." });
      navigate("/home");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect with Google.";
      setStatus({ tone: "error", message });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="screen auth">
      <span className="screen-label">Sign up page</span>
      <div className="auth__header">
        <LogoMark size={64} />
        <div>
          <h1 className="auth__title">Welcome to <span className="brand-inline">DO IT</span></h1>
          <p className="auth__subtitle">Create an account and join us now!</p>
        </div>
      </div>

      <form className="auth__form" onSubmit={handleSignUp}>
        <label className="input-field">
          <span className="input-icon">
            <HiUser />
          </span>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
          />
        </label>

        <label className="input-field">
          <span className="input-icon">
            <HiEnvelope />
          </span>
          <input
            type="email"
            name="email"
            placeholder="E-mail"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </label>

        <label className="input-field">
          <span className="input-icon">
            <HiLockClosed />
          </span>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </label>

        {status ? (
          <div className={`status-pill status-pill--${status.tone}`}>{status.message}</div>
        ) : null}

        <button type="submit" className="primary-btn" disabled={isBusy}>
          sign up
        </button>
      </form>

      <p className="auth__switch">
        Already have an account? <Link to="/sign-in">sign in</Link>
      </p>

      <div className="auth__social">
        <span>Sign Up with:</span>
        <div className="auth__social-buttons">
          <button type="button" className="icon-btn" disabled aria-label="Apple sign up">
            <FaApple />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={handleGoogle}
            disabled={isBusy}
            aria-label="Google sign up"
          >
            <FcGoogle />
          </button>
        </div>
      </div>

      {showModal ? (
        <div className="modal-overlay" role="status" aria-live="polite">
          <div className="modal-card">
            <div className="modal-icon modal-icon--success" />
            <p>Your account has been created successfully</p>
            <p>You will receive a verification code in your email</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SignUp;
