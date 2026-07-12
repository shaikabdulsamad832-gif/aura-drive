import { useEffect } from "react";
import { OlaMaps } from "olamaps-web-sdk";

export default function OlaMap() {
  useEffect(() => {
    const olaMaps = new OlaMaps({
      apiKey: import.meta.env.VITE_OLA_API_KEY,
    });

    olaMaps.init({
      style:
        "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
      container: "map",
      center: [78.4867, 17.385],
      zoom: 12,
    });
  }, []);

  return (
    <div
      id="map"
      style={{
        width: "100%",
        height: "100vh",
      }}
    />
  );
}