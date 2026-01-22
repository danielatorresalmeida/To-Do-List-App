import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiEnvelope, HiLockClosed } from "react-icons/hi2";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { signInWithEmail, signInWithGoogle } from "../services/auth";
import LogoMark from "../components/LogoMark";

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsBusy(true);
    try {
      const user = await signInWithEmail(form.email, form.password);
      setStatus({ tone: "success", message: `Welcome back, ${user.displayName || user.email || "friend"}.` });
      navigate("/home");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      setStatus({ tone: "error", message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogle = async () => {
    setStatus(null);
    setIsBusy(true);
    try {
      const user = await signInWithGoogle();
      setStatus({ tone: "success", message: `Signed in as ${user.displayName || user.email || "Google user"}.` });
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
      <div className="auth__header">
        <LogoMark size={64} />
        <div>
          <h1 className="auth__title">Welcome back to <span className="brand-inline">DO IT</span></h1>
          <p className="auth__subtitle">Have another productive day!</p>
        </div>
      </div>

      <form className="auth__form" onSubmit={handleSignIn}>
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
            autoComplete="current-password"
            required
          />
        </label>

        <div className="auth__row">
          <button className="link-button" type="button">
            forget password?
          </button>
        </div>

        {status ? (
          <div className={`status-pill status-pill--${status.tone}`}>{status.message}</div>
        ) : null}

        <button type="submit" className="primary-btn" disabled={isBusy}>
          sign in
        </button>
      </form>

      <p className="auth__switch">
        Don't have an account? <Link to="/sign-up">sign up</Link>
      </p>

      <div className="auth__social">
        <span>Sign In with:</span>
        <div className="auth__social-buttons">
          <button type="button" className="icon-btn" disabled aria-label="Apple sign in">
            <FaApple />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={handleGoogle}
            disabled={isBusy}
            aria-label="Google sign in"
          >
            <FcGoogle />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
