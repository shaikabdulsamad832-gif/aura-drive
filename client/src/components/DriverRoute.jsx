import { Navigate } from "react-router-dom";

function DriverRoute({ children }) {
  let application = null;

  try {
    application = JSON.parse(
      localStorage.getItem("driverApplication") || "null"
    );
  } catch {
    application = null;
  }

  if (!application || application.status !== "Approved") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default DriverRoute;