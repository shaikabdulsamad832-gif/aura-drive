import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import title from "../assets/title.png";
import {
  clearAdminSession,
  getDriverApplications,
  getDriverSessions,
  isAdminLoggedIn,
  updateDriverApplicationStatus,
} from "../utils/driverApplications";

const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = useCallback(() => {
    setApplications(getDriverApplications());
    setSessions(getDriverSessions());
    setBookings(readArray("auraBookings"));
    setUsers(readArray("auraUsers"));
  }, []);

  useEffect(() => {
    loadData();

    const timer = window.setInterval(loadData, 1200);

    window.addEventListener("storage", loadData);
    window.addEventListener("driverApplicationsChanged", loadData);
    window.addEventListener("driverSessionsChanged", loadData);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", loadData);
      window.removeEventListener(
        "driverApplicationsChanged",
        loadData
      );
      window.removeEventListener("driverSessionsChanged", loadData);
    };
  }, [loadData]);

  const stats = useMemo(() => {
    const onlineDrivers = sessions.filter(
      (session) => session.online
    ).length;

    const loggedDrivers = sessions.filter(
      (session) => session.loggedIn
    ).length;

    const pendingApplications = applications.filter(
      (application) => application.status === "Pending"
    ).length;

    const completedRides = bookings.filter((booking) =>
      String(booking.status || booking.driverStatus || "")
        .toLowerCase()
        .includes("complete")
    ).length;

    const activeRides = bookings.filter((booking) => {
      const status = String(
        booking.status || booking.driverStatus || ""
      ).toLowerCase();

      return (
        !status.includes("complete") &&
        !status.includes("cancel")
      );
    }).length;

    const revenue = bookings.reduce((total, booking) => {
      const paid =
        String(booking.paymentStatus || "").toLowerCase() ===
        "paid";

      return paid ? total + Number(booking.fare || 0) : total;
    }, 0);

    return {
      onlineDrivers,
      loggedDrivers,
      pendingApplications,
      completedRides,
      activeRides,
      revenue,
    };
  }, [applications, bookings, sessions]);

  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin-login" replace />;
  }

  const logout = () => {
    clearAdminSession();
    navigate("/admin-login", { replace: true });
  };

  const changeApplicationStatus = (id, status) => {
    updateDriverApplicationStatus(id, status);
    loadData();
  };

  const getLocationName = (value, fallback) => {
    if (!value) return fallback;
    if (typeof value === "string") return value;

    return (
      value.name ||
      value.formatted_address ||
      value.address ||
      fallback
    );
  };

  return (
    <main className="adminDashboardPage">
      <header className="adminDashboardHeader">
        <div className="adminDashboardBrand">
          <img src={logo} alt="Aura Drive" />
          <img src={title} alt="Aura Drive" />
          <span>Administration</span>
        </div>

        <div className="adminDashboardHeaderActions">
          <button type="button" onClick={loadData}>
            Refresh
          </button>
          <button
            type="button"
            className="adminDashboardLogout"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="adminDashboardShell">
        <aside className="adminDashboardSidebar">
          <div className="adminProfileCard">
            <div>A</div>
            <span>System Administrator</span>
            <strong>admin@auradrive.com</strong>
          </div>

          {[
            ["overview", "Overview"],
            ["applications", "Driver Applications"],
            ["drivers", "Driver Activity"],
            ["rides", "All Rides"],
            ["users", "Registered Riders"],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={activeTab === key ? "active" : ""}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </aside>

        <section className="adminDashboardContent">
          <div className="adminDashboardTitle">
            <span>Live Operations</span>
            <h1>Aura Control Centre</h1>
            <p>
              Observe activity and manage driver verification.
            </p>
          </div>

          {activeTab === "overview" && (
            <>
              <div className="adminStatsGrid">
                <article>
                  <span>Registered Riders</span>
                  <strong>{users.length}</strong>
                  <small>Created rider accounts</small>
                </article>
                <article>
                  <span>Driver Applications</span>
                  <strong>{applications.length}</strong>
                  <small>{stats.pendingApplications} pending</small>
                </article>
                <article>
                  <span>Logged Drivers</span>
                  <strong>{stats.loggedDrivers}</strong>
                  <small>Driver sessions created</small>
                </article>
                <article>
                  <span>Online Drivers</span>
                  <strong>{stats.onlineDrivers}</strong>
                  <small>Currently available</small>
                </article>
                <article>
                  <span>Active Rides</span>
                  <strong>{stats.activeRides}</strong>
                  <small>Not completed or cancelled</small>
                </article>
                <article>
                  <span>Completed Rides</span>
                  <strong>{stats.completedRides}</strong>
                  <small>Successful journeys</small>
                </article>
                <article>
                  <span>Total Bookings</span>
                  <strong>{bookings.length}</strong>
                  <small>All booking records</small>
                </article>
                <article>
                  <span>Paid Revenue</span>
                  <strong>₹{stats.revenue}</strong>
                  <small>Paid rides only</small>
                </article>
              </div>

              <div className="adminOverviewGrid">
                <section>
                  <div className="adminSectionHeading">
                    <div>
                      <span>Verification Queue</span>
                      <h2>Pending Driver Applications</h2>
                    </div>
                  </div>

                  {applications.filter(
                    (application) =>
                      application.status === "Pending"
                  ).length === 0 ? (
                    <div className="adminEmptyState">
                      No pending driver applications
                    </div>
                  ) : (
                    applications
                      .filter(
                        (application) =>
                          application.status === "Pending"
                      )
                      .slice(0, 5)
                      .map((application) => (
                        <div
                          className="adminApplicationRow"
                          key={application.id}
                        >
                          <div>
                            <strong>
                              {application.fullName ||
                                application.name}
                            </strong>
                            <span>
                              {application.vehicleNumber} ·{" "}
                              {application.vehicleType}
                            </span>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                changeApplicationStatus(
                                  application.id,
                                  "Approved"
                                )
                              }
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="reject"
                              onClick={() =>
                                changeApplicationStatus(
                                  application.id,
                                  "Rejected"
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </section>

                <section>
                  <div className="adminSectionHeading">
                    <div>
                      <span>Driver Network</span>
                      <h2>Current Driver Activity</h2>
                    </div>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="adminEmptyState">
                      No driver sessions recorded
                    </div>
                  ) : (
                    sessions.slice(0, 6).map((session) => (
                      <div
                        className="adminDriverActivityRow"
                        key={session.driverId}
                      >
                        <div
                          className={
                            session.online
                              ? "adminDriverDot online"
                              : "adminDriverDot"
                          }
                        />
                        <div>
                          <strong>{session.name}</strong>
                          <span>
                            {session.vehicleNumber ||
                              "Vehicle pending"}
                          </span>
                        </div>
                        <b>
                          {session.online ? "Online" : "Offline"}
                        </b>
                      </div>
                    ))
                  )}
                </section>
              </div>
            </>
          )}

          {activeTab === "applications" && (
            <section className="adminDataPanel">
              <div className="adminSectionHeading">
                <div>
                  <span>Partner Verification</span>
                  <h2>All Driver Applications</h2>
                </div>
              </div>

              <div className="adminTableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Mobile</th>
                      <th>Vehicle</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          {application.fullName ||
                            application.name}
                        </td>
                        <td>{application.mobile}</td>
                        <td>{application.vehicleNumber}</td>
                        <td>{application.vehicleType}</td>
                        <td>
                          <span
                            className={`adminStatus ${String(
                              application.status
                            ).toLowerCase()}`}
                          >
                            {application.status}
                          </span>
                        </td>
                        <td>
                          {application.submittedAt
                            ? new Date(
                                application.submittedAt
                              ).toLocaleString("en-IN")
                            : "Not available"}
                        </td>
                        <td>
                          <div className="adminTableActions">
                            <button
                              type="button"
                              onClick={() =>
                                changeApplicationStatus(
                                  application.id,
                                  "Approved"
                                )
                              }
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="reject"
                              onClick={() =>
                                changeApplicationStatus(
                                  application.id,
                                  "Rejected"
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "drivers" && (
            <section className="adminDataPanel">
              <div className="adminSectionHeading">
                <div>
                  <span>Driver Network</span>
                  <h2>Driver Login and Online Status</h2>
                </div>
              </div>

              <div className="adminCardsList">
                {sessions.map((session) => (
                  <article key={session.driverId}>
                    <div className="adminDriverAvatar">
                      {String(session.name || "D")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3>{session.name}</h3>
                      <p>
                        {session.vehicleNumber} ·{" "}
                        {session.vehicleType}
                      </p>
                    </div>
                    <span
                      className={
                        session.online
                          ? "adminStatus online"
                          : "adminStatus offline"
                      }
                    >
                      {session.online ? "Online" : "Offline"}
                    </span>
                    <small>
                      Last seen:{" "}
                      {session.lastSeenAt
                        ? new Date(
                            session.lastSeenAt
                          ).toLocaleString("en-IN")
                        : "Not available"}
                    </small>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === "rides" && (
            <section className="adminDataPanel">
              <div className="adminSectionHeading">
                <div>
                  <span>Ride Operations</span>
                  <h2>Every Booking</h2>
                </div>
              </div>

              <div className="adminCardsList">
                {bookings.map((booking, index) => (
                  <article
                    key={
                      booking.id ||
                      booking._id ||
                      `booking-${index}`
                    }
                  >
                    <div className="adminRideSymbol">
                      {booking.cabType?.charAt(0) || "R"}
                    </div>
                    <div>
                      <h3>
                        {getLocationName(
                          booking.pickup,
                          "Pickup"
                        )}{" "}
                        →{" "}
                        {getLocationName(
                          booking.drop,
                          "Destination"
                        )}
                      </h3>
                      <p>
                        {booking.cabType} · {booking.distance} km ·
                        ₹{booking.fare}
                      </p>
                    </div>
                    <span className="adminStatus">
                      {booking.driverStatus ||
                        booking.status ||
                        "Confirmed"}
                    </span>
                    <small>
                      Payment:{" "}
                      {booking.paymentStatus || "Pending"}
                    </small>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === "users" && (
            <section className="adminDataPanel">
              <div className="adminSectionHeading">
                <div>
                  <span>Rider Accounts</span>
                  <h2>Registered Riders</h2>
                </div>
              </div>

              <div className="adminCardsList">
                {users.map((user) => (
                  <article key={user.id || user.email}>
                    <div className="adminDriverAvatar">
                      {String(user.name || user.email || "R")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3>{user.name || "Aura Rider"}</h3>
                      <p>{user.email}</p>
                    </div>
                    <span className="adminStatus approved">
                      Rider
                    </span>
                    <small>{user.phone || "Phone not available"}</small>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

export default AdminDashboard;
