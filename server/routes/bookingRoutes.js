const express = require("express");
const Booking = require("../models/Booking");

const router = express.Router();

const calculateFare = (cabType, distance) => {
  const rates = {
    Mini: 15,
    Sedan: 20,
    SUV: 28,
    Luxury: 45,
  };

  return distance * (rates[cabType] || 15);
};

router.post("/book", async (req, res) => {
  try {
    const { userId, name, phone, pickup, drop, cabType, distance } = req.body;

    if (!name || !phone || !pickup || !drop || !cabType || !distance) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const fare = calculateFare(cabType, Number(distance));

    const booking = await Booking.create({
      userId,
      name,
      phone,
      pickup,
      drop,
      cabType,
      distance,
      fare,
    });

    res.status(201).json({
      message: "Cab booked successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: "Booking failed", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user bookings" });
  }
});

router.put("/cancel/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "Cancelled" },
      { new: true }
    );

    res.json({
      message: "Booking cancelled",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: "Cancel failed" });
  }
});

module.exports = router;