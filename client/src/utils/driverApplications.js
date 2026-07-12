const APPLICATIONS_KEY = "auraDriverApplications";
const ADMIN_SESSION_KEY = "auraAdminSession";
const DRIVER_SESSIONS_KEY = "auraDriverSessions";

const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeArray = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const addDriverApplication = (details) => {
  const applications = readArray(APPLICATIONS_KEY);

  const application = {
    ...details,
    id:
      details.id ||
      `DRIVER-${Date.now()}-${Math.floor(
        Math.random() * 100000
      )}`,
    status: details.status || "Pending",
    submittedAt:
      details.submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  writeArray(APPLICATIONS_KEY, [
    application,
    ...applications.filter(
      (item) => item.id !== application.id
    ),
  ]);

  window.dispatchEvent(new Event("driverApplicationsChanged"));

  return application;
};

export const getDriverApplications = () => {
  return readArray(APPLICATIONS_KEY);
};

export const updateDriverApplicationStatus = (
  applicationId,
  status
) => {
  const applications = getDriverApplications();

  const updated = applications.map((application) =>
    application.id === applicationId
      ? {
          ...application,
          status,
          updatedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        }
      : application
  );

  writeArray(APPLICATIONS_KEY, updated);

  try {
    const currentApplication = JSON.parse(
      localStorage.getItem("driverApplication") || "null"
    );

    if (currentApplication?.id === applicationId) {
      localStorage.setItem(
        "driverApplication",
        JSON.stringify({
          ...currentApplication,
          status,
          updatedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        })
      );
    }
  } catch {
    localStorage.removeItem("driverApplication");
  }

  window.dispatchEvent(new Event("driverApplicationsChanged"));
  window.dispatchEvent(new Event("auraModeChanged"));

  return updated.find(
    (application) => application.id === applicationId
  );
};

export const createAdminSession = () => {
  const session = {
    role: "admin",
    email: "admin@auradrive.com",
    loggedInAt: new Date().toISOString(),
  };

  localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify(session)
  );
  window.dispatchEvent(new Event("adminAuthChanged"));
  return session;
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new Event("adminAuthChanged"));
};

export const isAdminLoggedIn = () => {
  try {
    const session = JSON.parse(
      localStorage.getItem(ADMIN_SESSION_KEY) || "null"
    );

    return session?.role === "admin";
  } catch {
    return false;
  }
};

export const setDriverOnline = (application, online) => {
  if (!application?.id) {
    return [];
  }

  const sessions = readArray(DRIVER_SESSIONS_KEY);
  const now = new Date().toISOString();

  const existing = sessions.find(
    (session) => session.driverId === application.id
  );

  const nextSession = {
    driverId: application.id,
    name: application.fullName || application.name || "Aura Driver",
    mobile: application.mobile || "",
    vehicleNumber: application.vehicleNumber || "",
    vehicleType: application.vehicleType || "",
    online,
    loggedIn: online || existing?.loggedIn || false,
    lastSeenAt: now,
    loggedInAt:
      online && !existing?.loggedInAt
        ? now
        : existing?.loggedInAt || null,
    loggedOutAt: online ? null : now,
  };

  const updated = [
    nextSession,
    ...sessions.filter(
      (session) => session.driverId !== application.id
    ),
  ];

  writeArray(DRIVER_SESSIONS_KEY, updated);
  window.dispatchEvent(new Event("driverSessionsChanged"));
  return updated;
};

export const getDriverSessions = () => {
  return readArray(DRIVER_SESSIONS_KEY);
};

export const createDriverSession = (application) => {
  const session = {
    driverId: application.id,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(
    "auraDriverSession",
    JSON.stringify(session)
  );
  setDriverOnline(application, true);
  return session;
};

export const clearDriverSession = (application) => {
  if (application) {
    setDriverOnline(application, false);
  }

  localStorage.removeItem("auraDriverSession");
  localStorage.removeItem("driverToken");
  localStorage.removeItem("driverUser");
  localStorage.removeItem("driverMode");
};

export const hasDriverSession = (application) => {
  try {
    const session = JSON.parse(
      localStorage.getItem("auraDriverSession") || "null"
    );

    return Boolean(
      application?.id &&
        session?.driverId === application.id
    );
  } catch {
    return false;
  }
};
