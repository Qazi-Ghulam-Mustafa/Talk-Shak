import { useState } from "react";
import { Link, Navigate, replace, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../Context/AuthContext";

const Signup = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p>Loading...</p>;
  if (user) return <Navigate to="/chat" replace />;

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (name.trim() === "") {
      // alert("Name should be required")
      setMessage("Name should be required");
      return;
    } else if (name.trim().length < 5) {
      setMessage("Name Should be Greater Than 5 charcter");
      return;
    } else if (email.trim() === "") {
      setMessage("Email Must be required");
      return;
    } else if (!email.includes("@")) {
      setMessage("Enter Valid Email");
      return;
    } else if (password === "") {
      setMessage("Password Must be required");
      return;
    } else if (password.length < 8) {
      setMessage("Password Should be Greater Than 8 charcter");
      return;
    }
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      // if (error) {
      //   console.error("Supabase signup error:", error);
      //   setMessage(error.message);
      //   return;
      // }

      if (error) throw error;

      console.log("Signup response:", data);

      if (data.session) {
        (navigate("/chat"), { replace: true });
      } else {
        setMessage(
          "Account Created! Check your email to verify your account, then log in. ",
        );
      }
    } catch (error) {
      console.error("Unexpected signup error:", error);
      setMessage("Something went wrong, Please Try Again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <main className="auth-page">
        <div className="auth-card">
          <Link to="/" className="brand">
            Talk Shak
          </Link>
          <h1>Create Account</h1>
          <p className="muted">Start Chatting on Talk Shak Today</p>
          <label className="label">Full Name:</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label>Email : </label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>Password :</label>
          <input
            type="password"
            value={password}
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          <button
            className="btn btn-primary full-width"
            onClick={handleSignup}
            type="submit"
           disabled={submitting}
          >
            {submitting ? "Creating Account..." : "Sign Up"}
          </button>

          <p>
            Already have a account? <Link to="/login">Login</Link>
          </p>
        </div>
      </main>
    </>
  );
};

export default Signup;
