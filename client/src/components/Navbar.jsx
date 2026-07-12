import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import logo from "../assets/logo.png";
import title from "../assets/title.png";
import {
  clearAdminSession,
  isAdminLoggedIn,
} from "../utils/driverApplications";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState(
    isAdminLoggedIn()
  );
  const [activeMode, setActiveMode] = useState(
    localStorage.getItem("auraActiveMode") || "rider"
  );

  const loadNavbarData = () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (
        storedUser &&
        storedUser !== "null" &&
        storedUser !== "undefined"
      ) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }

    setAdminLoggedIn(isAdminLoggedIn());

    setActiveMode(
      localStorage.getItem("auraActiveMode") || "rider"
    );
  };

  useEffect(() => {
    loadNavbarData();

    window.addEventListener("storage", loadNavbarData);
    window.addEventListener("auraModeChanged", loadNavbarData);
    window.addEventListener("authChanged", loadNavbarData);
    window.addEventListener("adminAuthChanged", loadNavbarData);

    return () => {
      window.removeEventListener("storage", loadNavbarData);
      window.removeEventListener(
        "auraModeChanged",
        loadNavbarData
      );
      window.removeEventListener("authChanged", loadNavbarData);
      window.removeEventListener(
        "adminAuthChanged",
        loadNavbarData
      );
    };
  }, []);

  const logoutRider = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("accessToken");
    localStorage.setItem("auraActiveMode", "rider");

    setUser(null);
    setActiveMode("rider");

    window.dispatchEvent(new Event("authChanged"));
    window.dispatchEvent(new Event("auraModeChanged"));

    navigate("/login", {
      replace: true,
    });
  };

  const logoutAdmin = () => {
    clearAdminSession();
    setAdminLoggedIn(false);

    window.dispatchEvent(new Event("adminAuthChanged"));

    navigate("/admin-login", {
      replace: true,
    });
  };

  const driverHomeMode =
    activeMode === "driver" &&
    (location.pathname === "/" ||
      location.pathname === "/home");

  const driverDashboard = location.pathname === "/driver";

  const adminPage =
    location.pathname === "/admin" ||
    location.pathname === "/admin-login";

  if (driverHomeMode || driverDashboard || adminPage) {
    return null;
  }

  return (
    <header className="navbar">
      <div className="navbarInner">
        <Link to="/" className="brand">
          <img
            src={logo}
            className="logoImg"
            alt="Aura Drive Logo"
          />

          <img
            src={title}
            className="titleImg"
            alt="Aura Drive"
          />
        </Link>

        <nav className="navMenu">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Home
          </NavLink>

          {user && (
            <>
              <NavLink
                to="/my-bookings"
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                My Bookings
              </NavLink>

              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                Profile
              </NavLink>
            </>
          )}

          {!user && !adminLoggedIn && (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                Login
              </NavLink>

              <NavLink
                to="/admin-login"
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                Admin Login
              </NavLink>

              <Link
                to="/register"
                className="goldBtnSmall"
              >
                Register
              </Link>
            </>
          )}

          {user && (
            <button
              type="button"
              className="goldBtnSmall"
              onClick={logoutRider}
            >
              Logout
            </button>
          )}

          {adminLoggedIn && (
            <button
              type="button"
              className="goldBtnSmall"
              onClick={logoutAdmin}
            >
              Admin Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;