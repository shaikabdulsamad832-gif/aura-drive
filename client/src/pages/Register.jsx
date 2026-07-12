import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "phone"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));

    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    const passwordRule =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!name) {
      setError("Enter your full name");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }

    if (!email.endsWith("@gmail.com")) {
      setError("Only Gmail accounts are allowed");
      return;
    }

    if (!passwordRule.test(password)) {
      setError(
        "Password must contain uppercase, lowercase, number, special character and at least 8 characters"
      );
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

    const existingUser = users.find(
      (user) =>
        user.email?.toLowerCase() === email
    );

    if (existingUser) {
      setError(
        "An account already exists with this Gmail address"
      );
      return;
    }

    const user = {
      id: `USER-${Date.now()}`,
      name,
      phone,
      email,
      password,
      role: "rider",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "auraUsers",
      JSON.stringify([user, ...users])
    );

    localStorage.setItem(
      "user",
      JSON.stringify(user)
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
    <main className="auraLoginPage auraRegisterPage">
      <section className="auraLoginHero auraRegisterHero">
        <div className="auraLoginHeroContent">
          <div className="auraLoginBadge">
            <img src={logo} alt="Aura Drive" />
            <span>Join Aura Drive</span>
          </div>

          <h1>
            Travel beyond
            <strong>ordinary.</strong>
          </h1>

          <p>
            Create your rider account and experience secure,
            comfortable and premium journeys with Aura Drive.
          </p>

          <div className="auraLoginFeatures">
            <article>
              <span>01</span>
              <strong>Fast booking</strong>
              <p>
                Select pickup, destination and vehicle in a few
                simple steps.
              </p>
            </article>

            <article>
              <span>02</span>
              <strong>Verified drivers</strong>
              <p>
                Travel with approved Aura Drive driver partners.
              </p>
            </article>

            <article>
              <span>03</span>
              <strong>Transparent fares</strong>
              <p>
                Check distance and estimated fare before confirming.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="auraLoginFormSection auraRegisterFormSection">
        <form
          className="auraLoginCard auraRegisterCard"
          onSubmit={handleSubmit}
        >
          <div className="auraLoginHeading">
            <span>Create Account</span>

            <h2>Rider Registration</h2>

            <p>
              Complete your details to join Aura Drive.
            </p>
          </div>

          <div className="auraRegisterGrid">
            <label className="auraLoginField">
              <span>Full Name</span>

              <div className="auraLoginInput">
                <div className="auraLoginInputIcon">
                  A
                </div>

                <input
                  type="text"
                  name="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </div>
            </label>

            <label className="auraLoginField">
              <span>Phone Number</span>

              <div className="auraLoginInput">
                <div className="auraLoginInputIcon">
                  +91
                </div>

                <input
                  type="tel"
                  name="phone"
                  inputMode="numeric"
                  placeholder="10-digit number"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  required
                />
              </div>
            </label>
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
            <span>Strong Password</span>

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
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
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

          <p className="auraRegisterPasswordHint">
            Use uppercase, lowercase, number and special character.
          </p>

          {error && (
            <div className="auraLoginError">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auraLoginSubmit"
          >
            Create Aura Account
            <span>→</span>
          </button>

          <p className="auraLoginRegisterText">
            Already registered?

            <Link to="/login">
              Login to your account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Register;