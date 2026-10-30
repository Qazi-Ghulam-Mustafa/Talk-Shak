// import HomePage from "./pages/Home";

// const App = () => {
//   return (
//     <>
//     <HomePage/>
//     </>
//   );
// };

// export default App;


import {  Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import ProtectedRoutes from "./components/ProtectedRoutes";
import { AuthProvider } from "./Context/AuthContext";


function App() {
  return (
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/chat"
            element={
              <ProtectedRoutes>
                <Chat />
              </ProtectedRoutes>
            }
          />
          <Route path="*" element={<h2>404 Page Not Found</h2>}></Route>
        </Routes>
      </AuthProvider>
  );
}

export default App;
