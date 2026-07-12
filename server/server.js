const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

const userRoutes = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const olaRoutes = require("./routes/olaRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const driverMapRoutes = require("./routes/driverMapRoutes");

dotenv.config();

const app = express();

const normalizeOrigin = (value) => {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
};

const environmentOrigins = String(
  process.env.CLIENT_URL || ""
)
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://aura-drive-woad.vercel.app",
  ...environmentOrigins,
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    console.log("Blocked CORS origin:", normalizedOrigin);

    callback(
      new Error(
        `CORS blocked request from ${normalizedOrigin}`
      )
    );
  },
  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Length"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "20mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb",
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Aura Drive API is running",
    frontend:
      "https://aura-drive-woad.vercel.app",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Aura Drive server is healthy",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/ola", olaRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/driver-map", driverMapRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (
    String(error.message || "").includes(
      "CORS blocked request"
    )
  ) {
    res.status(403).json({
      success: false,
      message: error.message,
    });
    return;
  }

  res.status(error.status || 500).json({
    success: false,
    message:
      error.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from environment variables"
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Aura Drive server running on port ${PORT}`
      );

      console.log(
        `Health check: http://localhost:${PORT}/api/health`
      );

      console.log(
        `Payment test: http://localhost:${PORT}/api/payments/test`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
};

startServer();