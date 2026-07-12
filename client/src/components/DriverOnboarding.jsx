import { useState } from "react";
import logo from "../assets/logo.png";
import { addDriverApplication } from "../utils/driverApplications";

const initialForm = {
  mobile: "",
  otp: "",
  fullName: "",
  vehicleNumber: "",
  vehicleType: "Sedan",
  licenseFront: null,
  licenseBack: null,
  rcFront: null,
  rcBack: null,
  aadharFront: null,
  aadharBack: null,
};

function DriverOnboarding({ onClose }) {
  const [step, setStep] = useState(1);
  const [sentOtp, setSentOtp] = useState("");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(new Error(`Unable to read ${file.name}`));

      reader.readAsDataURL(file);
    });

  const handleTextChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleMobileChange = (event) => {
    const value = event.target.value.replace(/\D/g, "");

    setForm((previous) => ({
      ...previous,
      mobile: value.slice(0, 10),
    }));
  };

  const handleOtpChange = (event) => {
    const value = event.target.value.replace(/\D/g, "");

    setForm((previous) => ({
      ...previous,
      otp: value.slice(0, 6),
    }));
  };

  const handleFile = async (event) => {
    const { name, files } = event.target;
    const file = files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      event.target.value = "";
      return;
    }

    if (file.size > 800 * 1024) {
      alert(
        "For this local demo, each image must be below 800 KB."
      );
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);

      setForm((previous) => ({
        ...previous,
        [name]: {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
        },
      }));
    } catch (error) {
      console.error(error);
      alert("Unable to read this image");
    }
  };

  const sendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      alert("Enter a valid 10-digit Indian mobile number");
      return;
    }

    const demoOtp = "123456";

    setSentOtp(demoOtp);
    setStep(2);

    alert("Demo OTP: 123456");
  };

  const verifyOtp = () => {
    if (form.otp !== sentOtp) {
      alert("Invalid OTP. Use 123456 for this demo.");
      return;
    }

    setStep(3);
  };

  const validateDocuments = () => {
    const requiredDocuments = [
      "licenseFront",
      "licenseBack",
      "rcFront",
      "rcBack",
      "aadharFront",
      "aadharBack",
    ];

    return requiredDocuments.every((key) => form[key]);
  };

  const submitDriverApplication = async () => {
    if (!form.fullName.trim()) {
      alert("Enter the driver's full name");
      return;
    }

    if (!form.vehicleNumber.trim()) {
      alert("Enter the vehicle registration number");
      return;
    }

    if (!validateDocuments()) {
      alert("Upload all six required document images");
      return;
    }

    try {
      setSubmitting(true);

      const application = addDriverApplication({
        fullName: form.fullName.trim(),
        mobile: form.mobile,
        vehicleNumber: form.vehicleNumber
          .trim()
          .toUpperCase(),
        vehicleType: form.vehicleType,
        status: "Pending",
        documents: {
          licenseFront: form.licenseFront,
          licenseBack: form.licenseBack,
          rcFront: form.rcFront,
          rcBack: form.rcBack,
          aadharFront: form.aadharFront,
          aadharBack: form.aadharBack,
        },
      });

      localStorage.setItem(
        "driverApplication",
        JSON.stringify(application)
      );

      setStep(4);
    } catch (error) {
      console.error(error);

      alert(
        "Unable to store the application. Try smaller document images."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const documentItems = [
    {
      key: "licenseFront",
      title: "Driving Licence Front",
    },
    {
      key: "licenseBack",
      title: "Driving Licence Back",
    },
    {
      key: "rcFront",
      title: "Vehicle RC Front",
    },
    {
      key: "rcBack",
      title: "Vehicle RC Back",
    },
    {
      key: "aadharFront",
      title: "Aadhaar Front",
    },
    {
      key: "aadharBack",
      title: "Aadhaar Back",
    },
  ];

  return (
    <div className="driverOnboardOverlay">
      <section className="driverOnboardCard">
        <button
          type="button"
          className="driverCloseBtn"
          onClick={onClose}
          aria-label="Close driver onboarding"
        >
          ×
        </button>

        <div className="driverOnboardHeader">
          <img src={logo} alt="Aura Drive" />

          <div>
            <p>Aura Driver Partner</p>
            <h2>Driver Verification</h2>
          </div>
        </div>

        <div className="driverSteps">
          {[1, 2, 3, 4].map((number) => (
            <span
              key={number}
              className={step >= number ? "active" : ""}
            >
              {number}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="driverStepBox">
            <h3>Mobile Verification</h3>

            <p>
              Enter your mobile number to receive a verification
              code.
            </p>

            <div className="driverPhoneInput">
              <span>+91</span>

              <input
                type="tel"
                inputMode="numeric"
                value={form.mobile}
                onChange={handleMobileChange}
                placeholder="10-digit mobile number"
              />
            </div>

            <button type="button" onClick={sendOtp}>
              Send OTP
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="driverStepBox">
            <h3>Verify OTP</h3>

            <p>
              Enter the verification code sent to +91{" "}
              {form.mobile}.
            </p>

            <input
              className="driverOtpInput"
              type="text"
              inputMode="numeric"
              value={form.otp}
              onChange={handleOtpChange}
              placeholder="Enter 6-digit OTP"
            />

            <button type="button" onClick={verifyOtp}>
              Verify Mobile Number
            </button>

            <button
              type="button"
              className="driverSecondaryAction"
              onClick={() => setStep(1)}
            >
              Change mobile number
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="driverStepBox">
            <h3>Driver and Vehicle Documents</h3>

            <p>
              Provide your details and upload clear front and back
              images.
            </p>

            <div className="driverDetailsGrid">
              <label>
                Full Name

                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleTextChange}
                  placeholder="Driver's full name"
                />
              </label>

              <label>
                Vehicle Number

                <input
                  name="vehicleNumber"
                  value={form.vehicleNumber}
                  onChange={handleTextChange}
                  placeholder="Example: TS09AB1234"
                />
              </label>

              <label className="driverFullField">
                Vehicle Type

                <select
                  name="vehicleType"
                  value={form.vehicleType}
                  onChange={handleTextChange}
                >
                  <option value="Mini">Mini</option>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="Luxury">Luxury</option>
                </select>
              </label>
            </div>

            <div className="uploadGrid">
              {documentItems.map((item) => (
                <label
                  key={item.key}
                  className={
                    form[item.key]
                      ? "driverUploadBox uploaded"
                      : "driverUploadBox"
                  }
                >
                  <strong>{item.title}</strong>

                  {form[item.key] ? (
                    <img
                      src={form[item.key].dataUrl}
                      alt={item.title}
                    />
                  ) : (
                    <span>Upload image</span>
                  )}

                  <input
                    type="file"
                    name={item.key}
                    accept="image/*"
                    onChange={handleFile}
                  />
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={submitDriverApplication}
              disabled={submitting}
            >
              {submitting
                ? "Submitting Application..."
                : "Submit for Verification"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="driverSubmissionSuccess">
            <div className="driverSuccessIcon">✓</div>

            <h3>Application Submitted</h3>

            <p>
              Your driver application is awaiting admin
              verification.
            </p>

            <button type="button" onClick={onClose}>
              Return to Driver Mode
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default DriverOnboarding;