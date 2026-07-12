import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

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

    const email = form.email.trim().toLowerCase();

    if (!email.endsWith("@gmail.com")) {
      setError("Only Gmail accounts are allowed");
      return;
    }

    if (!form.password.trim()) {
      setError("Enter your password");
      return;
    }

    let users = [];

    try {
      const storedUsers = JSON.parse(
        localStorage.getItem("auraUsers") || "[]"
      );

      users = Array.isArray(storedUsers)
        ? storedUsers
        : [];
    } catch {
      users = [];
    }

    const registeredUser = users.find(
      (user) =>
        user.email?.toLowerCase() === email &&
        user.password === form.password
    );

    if (!registeredUser && users.length > 0) {
      setError("Incorrect Gmail address or password");
      return;
    }

    const rider =
      registeredUser || {
        id: `USER-${Date.now()}`,
        name: email.split("@")[0],
        phone: "",
        email,
        password: form.password,
        createdAt: new Date().toISOString(),
      };

    if (!registeredUser) {
      localStorage.setItem(
        "auraUsers",
        JSON.stringify([rider, ...users])
      );
    }

    localStorage.setItem(
      "user",
      JSON.stringify(rider)
    );

    localStorage.setItem(
      "auraActiveMode",
      "rider"
    );

    window.dispatchEvent(
      new Event("authChanged")
    );

    window.dispatchEvent(
      new Event("auraModeChanged")
    );

    navigate("/", {
      replace: true,
    });
  };

  return (
    <main className="auraLoginPage">
      <section className="auraLoginHero">
        <div className="auraLoginHeroContent">
          <div className="auraLoginBadge">
            <img src={logo} alt="Aura Drive" />
            <span>Premium Rider Access</span>
          </div>

          <h1>
            Return to your
            <strong>Aura.</strong>
          </h1>

          <p>
            Book premium rides, track your driver and manage every
            journey from one secure account.
          </p>

          <div className="auraLoginFeatures">
            <article>
              <span>01</span>
              <strong>Live ride tracking</strong>
              <p>
                Follow your assigned driver directly on the map.
              </p>
            </article>

            <article>
              <span>02</span>
              <strong>Secure payments</strong>
              <p>
                Complete every payment using Razorpay checkout.
              </p>
            </article>

            <article>
              <span>03</span>
              <strong>Premium vehicles</strong>
              <p>
                Choose Mini, Sedan, SUV or Luxury vehicles.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="auraLoginFormSection">
        <form
          className="auraLoginCard"
          onSubmit={handleSubmit}
        >
          <div className="auraLoginHeading">
            <span>Welcome Back</span>
            <h2>Rider Login</h2>
            <p>
              Enter your Aura Drive account details.
            </p>
          </div>

          <label className="auraLoginField">
            <span>Gmail Address</span>

            <div className="auraLoginInput">
              <div className="auraLoginInputIcon">
                @
              </div>

              <input
                type="email"
                name="email"
                placeholder="yourname@gmail.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="auraLoginField">
            <span>Password</span>

            <div className="auraLoginInput auraLoginPasswordInput">
              <div className="auraLoginInputIcon">
                •
              </div>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>
          </label>

          {error && (
            <div className="auraLoginError">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auraLoginSubmit"
          >
            Login to Aura Drive
            <span>→</span>
          </button>

          <div className="auraLoginDivider">
            <span>Administrator Access</span>
          </div>

          <Link
            to="/admin-login"
            className="auraLoginAdminButton"
          >
            Open Admin Portal
            <span>→</span>
          </Link>

          <p className="auraLoginRegisterText">
            New to Aura Drive?

            <Link to="/register">
              Create an account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Login;