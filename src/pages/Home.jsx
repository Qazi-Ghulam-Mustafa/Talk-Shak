// import { useState } from "react";
// import './Home.css';
// import Navbar from "../components/Navbar";
// const HomePage=()=>{
// return(
//   <>
//   <Navbar/>
//   </>
// )
// }
// export default HomePage


import { Link } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

const HomePage=()=> {
  const { user, loading } = useAuth();

  return (
    <main className="home-page">
      <nav className="navbar">
        <Link to="/" className="brand">
          Talk Shak 
        </Link>

        <div className="nav-actions">
          {!loading && user ? (
            <Link to="/chat" className="btn btn-primary">
              Open Chat
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">
                Login
              </Link>

              <Link to="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            YOUR SPACE TO CONNECT
          </span>

          <h1>
            Simple conversations.
            <br />
            <span>Real connections.</span>
          </h1>

          <p>
            Chat with friends, share your thoughts,
            and stay connected in real time.
            All in one simple place.
          </p>

          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary">
              Get Started
            </Link>

            <Link to="/login" className="btn btn-outline">
              I already have an account
            </Link>
          </div>
        </div>

        <div className="chat-preview">
          <div className="preview-header">
            <div className="avatar">GM</div>
            <div>
              <strong>Qazi Ghulam Mustafa</strong>
              <p>Ready to chat</p>
            </div>
            <span className="online-dot" />
          </div>

          <div className="preview-messages">
            <div className="message received">
              Hey! How are you?
            </div>

            <div className="message sent">
              I'm good! What's up?
            </div>

            <div className="message received">
              Just checking in 😊
            </div>
          </div>

          <div className="preview-input">
            <span>Write a message...</span>
            <span className="send-icon">➤</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
