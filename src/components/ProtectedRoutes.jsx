import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { LuLoader } from "react-icons/lu";

const ProtectedRoutes = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p ><LuLoader style={{width:"100px",height:"100px",}} /></p>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children

};

export default ProtectedRoutes
