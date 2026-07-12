const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const router = express.Router();

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay keys are missing in the server .env file"
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const createReceipt = (rideId) => {
  const safeRideId = String(rideId || "ride")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(-18);

  return `aura_${safeRideId}_${Date.now()}`.slice(0, 40);
};

router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Aura Drive payment routes are working",
  });
});

router.post("/create-order", async (req, res) => {
  try {
    const { rideId, amount, cabType } = req.body;

    const parsedAmount = Number(amount);

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid amount is required",
      });
    }

    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: Math.round(parsedAmount * 100),
      currency: "INR",
      receipt: createReceipt(rideId),
      notes: {
        rideId: String(rideId),
        cabType: String(cabType || ""),
        application: "Aura Drive",
      },
    });

    return res.status(201).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error(
      "Razorpay create-order error:",
      error?.error?.description ||
        error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error?.error?.description ||
        error.message ||
        "Unable to create Razorpay order",
    });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const {
      rideId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !rideId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Complete payment verification details are required",
      });
    }

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "utf8"
    );

    const receivedBuffer = Buffer.from(
      razorpay_signature,
      "utf8"
    );

    const signatureValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

    if (!signatureValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const razorpay = getRazorpay();

    let payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message:
          "Payment does not belong to the supplied order",
      });
    }

    if (payment.status === "authorized") {
      payment = await razorpay.payments.capture(
        razorpay_payment_id,
        payment.amount,
        payment.currency
      );
    }

    if (payment.status !== "captured") {
      return res.status(409).json({
        success: false,
        message: `Payment status is ${payment.status}`,
        paymentStatus: payment.status,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        rideId: String(rideId),
        paymentId: payment.id,
        orderId: razorpay_order_id,
        amount: Number(payment.amount) / 100,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        email: payment.email || "",
        contact: payment.contact || "",
        paidAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Razorpay verification error:",
      error?.error?.description ||
        error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error?.error?.description ||
        error.message ||
        "Payment verification failed",
    });
  }
});

module.exports = router;