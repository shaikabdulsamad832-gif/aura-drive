function DownloadApp() {
  return (
    <section className="downloadAppSection">
      <div className="downloadContent">
        <span>Aura Drive APP</span>
        <h2>Book faster from your phone</h2>
        <p>
          Get faster booking, live tracking, saved places, and instant ride
          updates with the Aura Drive mobile experience.
        </p>

        <div className="storeButtons">
          <button>
            <small>Download on</small>
            <b>App Store</b>
          </button>

          <button>
            <small>Get it on</small>
            <b>Google Play</b>
          </button>
        </div>
      </div>

      <div className="phoneMockup">
        <div className="phoneTop"></div>

        <div className="phoneScreen">
          <h3>Aura Drive</h3>

          <div className="phoneRideCard">
            <span>Premium Sedan</span>
            <b>₹320</b>
          </div>

          <div className="phoneLine"></div>
          <div className="phoneLine short"></div>

          <button>Book Ride</button>
        </div>
      </div>
    </section>
  );
}

export default DownloadApp;