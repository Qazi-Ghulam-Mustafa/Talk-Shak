import { useState } from "react";
import { Link, replace, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../Context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (loading) return <p>Loading...</p>;
  if (user) return <Navigate to="/chat" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    if (email.trim() === "") {
      setMessage("Email is required");
      return;
    } else if (!email.includes("@")) {
      setMessage("Email is invalid");
      return;
    } else if (password.trim() === "") {
      setMessage("Password is required");
      return;
    } else if (password.length < 8) {
      setMessage("Password must be at least 8 characters long");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // if (error) {
      //   setMessage(error.message);
      //   return;
      // }

      if (error) throw error;
      (navigate("/chat"), { replace: true });

    } catch (error) {
      console.error("Login error:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
   <main className="auth-page">
     <div className="auth-card">
      <Link to="/" className="brand">Talk Shak</Link>
      <h1>Welcome Back !</h1>
      <p className="muted">Login to your account</p>

      <label>Email :</label>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label>Password :</label>
      <input
        type="password"
        placeholder="Enter your Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {message && <p role="status">{message}</p>}

      <button className="btn btn-primary full-width" onClick={handleLogin} type="submit" disabled={submitting}>
        {submitting ? "Logging in..." : "Login"}
      </button>

      <p className="auth-footer">
        Don't have an account <Link to="/signup"> Sign Up</Link>
      </p>
    </div>
   </main>
  );
};

export default Login;
