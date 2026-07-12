import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import title from "../assets/title.png";
import {
  createAdminSession,
  isAdminLoggedIn,
} from "../utils/driverApplications";

function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAdminLoggedIn()) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      form.email.trim().toLowerCase() !==
        "admin@auradrive.com" ||
      form.password !== "Aura@123"
    ) {
      setError("Incorrect admin email or password");
      return;
    }

    localStorage.removeItem("user");
    createAdminSession();
    window.dispatchEvent(new Event("authChanged"));
    navigate("/admin", { replace: true });
  };

  return (
    <main className="adminLoginPage">
      <section className="adminLoginCard">
        <div className="adminLoginBrand">
          <img
            src={logo}
            alt="Aura Drive"
            className="adminLoginLogo"
          />

          <img
            src={title}
            alt="Aura Drive"
            className="adminLoginTitle"
          />
        </div>

        <div className="adminLoginHeading">
          <span>Secure Administration</span>
          <h1>Admin Portal</h1>
          <p>
            Monitor riders, drivers, applications, rides and
            payment activity.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Admin Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@auradrive.com"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter admin password"
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <div className="adminLoginError">{error}</div>
          )}

          <button type="submit">
            Open Admin Dashboard
            <span>→</span>
          </button>
        </form>

        <div className="adminDemoCredentials">
          <span>Demo administrator</span>
          <p>admin@auradrive.com</p>
          <p>Aura@123</p>
        </div>
      </section>
    </main>
  );
}

export default AdminLogin;
