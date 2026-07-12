import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const DEFAULT_CENTER = {
  lat: 17.385,
  lng: 78.4867,
};

function LocationPicker({
  mode,
  pickup,
  drop,
  onConfirm,
  onClose,
}) {
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapRef = useRef(null);

  const searchTimerRef = useRef(null);
  const reverseTimerRef = useRef(null);

  const searchAbortRef = useRef(null);
  const reverseAbortRef = useRef(null);
  const resolveAbortRef = useRef(null);

  const mountedRef = useRef(true);
  const programmaticMoveRef = useRef(false);
  const selectedTargetRef = useRef(null);
  const latestCenterRef = useRef(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] =
    useState([]);
  const [selectedLocation, setSelectedLocation] =
    useState(null);
  const [searchFocused, setSearchFocused] =
    useState(true);
  const [searching, setSearching] =
    useState(false);
  const [resolvingPlace, setResolvingPlace] =
    useState(false);
  const [loadingAddress, setLoadingAddress] =
    useState(true);
  const [mapMoving, setMapMoving] =
    useState(false);
  const [searchError, setSearchError] =
    useState("");

  const isPickup = mode === "pickup";

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    });
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput, mode]);

  const initialCenter = useCallback(() => {
    if (
      isPickup &&
      Number.isFinite(Number(pickup?.lat)) &&
      Number.isFinite(Number(pickup?.lng))
    ) {
      return {
        lat: Number(pickup.lat),
        lng: Number(pickup.lng),
      };
    }

    if (
      !isPickup &&
      Number.isFinite(Number(drop?.lat)) &&
      Number.isFinite(Number(drop?.lng))
    ) {
      return {
        lat: Number(drop.lat),
        lng: Number(drop.lng),
      };
    }

    if (
      !isPickup &&
      Number.isFinite(Number(pickup?.lat)) &&
      Number.isFinite(Number(pickup?.lng))
    ) {
      return {
        lat: Number(pickup.lat),
        lng: Number(pickup.lng),
      };
    }

    return DEFAULT_CENTER;
  }, [isPickup, pickup, drop]);

  const extractAddress = (data) => {
    const result =
      data?.results?.[0] ||
      data?.data?.results?.[0] ||
      data?.result ||
      data?.data?.result;

    return (
      result?.formatted_address ||
      result?.formattedAddress ||
      result?.full_address ||
      result?.fullAddress ||
      result?.display_name ||
      result?.displayName ||
      result?.name ||
      ""
    );
  };

  const reverseGeocode = useCallback(
    async (lat, lng, immediate = false) => {
      clearTimeout(reverseTimerRef.current);

      const run = async () => {
        reverseAbortRef.current?.abort();

        const controller =
          new AbortController();

        reverseAbortRef.current =
          controller;

        try {
          setLoadingAddress(true);

          const response = await axios.get(
            `${API_URL}/api/ola/reverse`,
            {
              params: { lat, lng },
              signal: controller.signal,
            }
          );

          const address =
            extractAddress(response.data);

          if (!mountedRef.current) {
            return;
          }

          setSelectedLocation({
            name:
              address ||
              "Address unavailable",
            lat: Number(lat),
            lng: Number(lng),
          });
        } catch (error) {
          if (
            error?.name === "CanceledError" ||
            error?.code === "ERR_CANCELED"
          ) {
            return;
          }

          console.error(
            "Reverse error:",
            error.response?.data ||
              error.message
          );

          if (mountedRef.current) {
            setSelectedLocation({
              name: "Address unavailable",
              lat: Number(lat),
              lng: Number(lng),
            });
          }
        } finally {
          if (mountedRef.current) {
            setLoadingAddress(false);
          }
        }
      };

      if (immediate) {
        run();
      } else {
        reverseTimerRef.current =
          setTimeout(run, 450);
      }
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    if (
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return undefined;
    }

    const center = initialCenter();
    latestCenterRef.current = center;

    const apiKey =
      import.meta.env.VITE_OLA_API_KEY;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:
        "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
      center: [center.lng, center.lat],
      zoom: 13.5,
      attributionControl: false,
      transformRequest: (url) => {
        if (
          url.includes("api.olamaps.io") &&
          apiKey
        ) {
          const separator =
            url.includes("?") ? "&" : "?";

          return {
            url: `${url}${separator}api_key=${apiKey}`,
          };
        }

        return { url };
      },
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
      }),
      "bottom-right"
    );

    map.on("load", () => {
      map.resize();
      focusInput();

      map.easeTo({
        center: [center.lng, center.lat],
        zoom: 12.4,
        duration: 450,
      });

      setTimeout(() => {
        if (!mapRef.current) {
          return;
        }

        programmaticMoveRef.current = true;

        selectedTargetRef.current = {
          name:
            isPickup
              ? pickup?.name || ""
              : drop?.name ||
                pickup?.name ||
                "",
          lat: center.lat,
          lng: center.lng,
        };

        map.flyTo({
          center: [center.lng, center.lat],
          zoom: 16,
          speed: 0.8,
          curve: 1.35,
          essential: true,
        });
      }, 500);

      reverseGeocode(
        center.lat,
        center.lng,
        true
      );
    });

    map.on("movestart", () => {
      setMapMoving(true);

      if (!programmaticMoveRef.current) {
        setSuggestions([]);
      }
    });

    map.on("move", () => {
      const current = map.getCenter();

      latestCenterRef.current = {
        lat: current.lat,
        lng: current.lng,
      };

      if (!programmaticMoveRef.current) {
        reverseGeocode(
          current.lat,
          current.lng
        );
      }
    });

    map.on("moveend", () => {
      const current = map.getCenter();

      setMapMoving(false);

      latestCenterRef.current = {
        lat: current.lat,
        lng: current.lng,
      };

      if (programmaticMoveRef.current) {
        programmaticMoveRef.current = false;

        const target =
          selectedTargetRef.current;

        selectedTargetRef.current = null;

        if (target) {
          latestCenterRef.current = {
            lat: target.lat,
            lng: target.lng,
          };

          setSelectedLocation(target);

          reverseGeocode(
            target.lat,
            target.lng,
            true
          );

          return;
        }
      }

      reverseGeocode(
        current.lat,
        current.lng,
        true
      );
    });

    return () => {
      mountedRef.current = false;

      clearTimeout(searchTimerRef.current);
      clearTimeout(reverseTimerRef.current);

      searchAbortRef.current?.abort();
      reverseAbortRef.current?.abort();
      resolveAbortRef.current?.abort();

      map.remove();
      mapRef.current = null;
    };
  }, [
    initialCenter,
    reverseGeocode,
    focusInput,
    isPickup,
    pickup?.name,
    drop?.name,
  ]);

  const searchPlaces = (value) => {
    setQuery(value);
    setSearchFocused(true);
    setSearchError("");

    clearTimeout(searchTimerRef.current);
    searchAbortRef.current?.abort();

    if (value.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    searchTimerRef.current =
      setTimeout(async () => {
        const controller =
          new AbortController();

        searchAbortRef.current =
          controller;

        try {
          setSearching(true);

          const center =
            mapRef.current?.getCenter() ||
            DEFAULT_CENTER;

          const response = await axios.get(
            `${API_URL}/api/ola/search`,
            {
              params: {
                query: value.trim(),
                lat: center.lat,
                lng: center.lng,
              },
              signal: controller.signal,
            }
          );

          const predictions =
            Array.isArray(
              response.data?.predictions
            )
              ? response.data.predictions
              : [];

          setSuggestions(predictions);

          if (predictions.length === 0) {
            setSearchError(
              "No matching places found"
            );
          }
        } catch (error) {
          if (
            error?.name === "CanceledError" ||
            error?.code === "ERR_CANCELED"
          ) {
            return;
          }

          console.error(
            "Search error:",
            error.response?.data ||
              error.message
          );

          setSuggestions([]);
          setSearchError(
            error.response?.data?.message ||
              "Unable to search locations"
          );
        } finally {
          if (mountedRef.current) {
            setSearching(false);
          }
        }
      }, 350);
  };

  const selectSuggestion = async (
    suggestion
  ) => {
    setSuggestions([]);
    setSearchFocused(false);
    setSearchError("");
    setResolvingPlace(true);

    resolveAbortRef.current?.abort();

    const controller =
      new AbortController();

    resolveAbortRef.current =
      controller;

    try {
      const suggestionLat = Number(
        suggestion?.geometry?.location?.lat
      );

      const suggestionLng = Number(
        suggestion?.geometry?.location?.lng
      );

      const response = await axios.get(
        `${API_URL}/api/ola/resolve-place`,
        {
          params: {
            description:
              suggestion.description,
            lat: Number.isFinite(
              suggestionLat
            )
              ? suggestionLat
              : undefined,
            lng: Number.isFinite(
              suggestionLng
            )
              ? suggestionLng
              : undefined,
          },
          signal: controller.signal,
        }
      );

      const location =
        response.data?.location;

      const lat = Number(location?.lat);
      const lng = Number(location?.lng);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        throw new Error(
          "Location coordinates are unavailable"
        );
      }

      const name =
        location?.formatted_address ||
        location?.name ||
        suggestion.description;

      const target = {
        name,
        lat,
        lng,
      };

      selectedTargetRef.current = target;
      programmaticMoveRef.current = true;
      latestCenterRef.current = {
        lat,
        lng,
      };

      setSelectedLocation(target);
      setQuery(suggestion.description);

      mapRef.current?.stop();

      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: 17.5,
        speed: 0.85,
        curve: 1.4,
        essential: true,
      });
    } catch (error) {
      if (
        error?.name === "CanceledError" ||
        error?.code === "ERR_CANCELED"
      ) {
        return;
      }

      console.error(
        "Resolve error:",
        error.response?.data ||
          error.message
      );

      setSearchError(
        error.response?.data?.message ||
          "Unable to open selected place"
      );

      setSearchFocused(true);
      focusInput();
    } finally {
      if (mountedRef.current) {
        setResolvingPlace(false);
      }
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setSearchError("");
    setSearchFocused(true);
    focusInput();
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError(
        "Current location is unavailable"
      );

      return;
    }

    setLoadingAddress(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat =
          position.coords.latitude;

        const lng =
          position.coords.longitude;

        const target = {
          name: "Current location",
          lat,
          lng,
        };

        selectedTargetRef.current = target;
        programmaticMoveRef.current = true;
        latestCenterRef.current = {
          lat,
          lng,
        };

        setSuggestions([]);
        setSearchError("");
        setSearchFocused(false);

        mapRef.current?.stop();

        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: 17.5,
          speed: 0.85,
          curve: 1.4,
          essential: true,
        });
      },
      () => {
        setLoadingAddress(false);
        setSearchError(
          "Allow location permission and try again"
        );
        setSearchFocused(true);
        focusInput();
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      }
    );
  };

  const confirmLocation = () => {
    if (
      loadingAddress ||
      resolvingPlace
    ) {
      return;
    }

    if (
      !selectedLocation ||
      !selectedLocation.name ||
      selectedLocation.name ===
        "Address unavailable" ||
      !Number.isFinite(
        Number(selectedLocation.lat)
      ) ||
      !Number.isFinite(
        Number(selectedLocation.lng)
      )
    ) {
      alert(
        "Please wait until the address is available"
      );

      return;
    }

    onConfirm({
      name: selectedLocation.name,
      lat: Number(selectedLocation.lat),
      lng: Number(selectedLocation.lng),
    });
  };

  const showSuggestions =
    searchFocused &&
    (searching ||
      suggestions.length > 0 ||
      Boolean(searchError));

  return (
    <div className="cabMapScreen">
      <div
        ref={mapContainerRef}
        className="cabMap"
      />

      <button
        type="button"
        className="floatingBackBtn"
        onClick={onClose}
      >
        ←
      </button>

      <div className="compactSearchBox">
        <div className="compactSearchHead">
          <div>
            <span>
              {isPickup
                ? "AURA PICKUP"
                : "AURA DESTINATION"}
            </span>

            <h2>
              {isPickup
                ? "Choose Pickup"
                : "Choose Destination"}
            </h2>

            <p>
              Search a place or move the map
            </p>
          </div>

          <button
            type="button"
            className="currentLocationButton"
            onClick={useCurrentLocation}
          >
            ◎
          </button>
        </div>

        <div
          className={`compactInput ${
            isPickup ? "" : "drop"
          }`}
        >
          <span />

          <input
            ref={searchInputRef}
            autoFocus
            value={query}
            autoComplete="off"
            placeholder={
              isPickup
                ? "Search pickup location"
                : "Search destination"
            }
            onFocus={() =>
              setSearchFocused(true)
            }
            onChange={(event) =>
              searchPlaces(
                event.target.value
              )
            }
          />

          {(searching ||
            resolvingPlace) && (
            <div className="searchMiniLoader" />
          )}

          {query &&
            !searching &&
            !resolvingPlace && (
              <button
                type="button"
                className="clearMapSearch"
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                onClick={clearSearch}
              >
                ×
              </button>
            )}
        </div>

        {showSuggestions && (
          <div className="compactSuggestions">
            {searching && (
              <div className="mapSuggestionStatus">
                <div className="suggestionLoader" />
                <span>Searching places...</span>
              </div>
            )}

            {!searching &&
              suggestions.map(
                (suggestion, index) => (
                  <button
                    type="button"
                    className="compactResult"
                    key={
                      suggestion.place_id ||
                      `${suggestion.description}-${index}`
                    }
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    onClick={() =>
                      selectSuggestion(
                        suggestion
                      )
                    }
                  >
                    <div className="resultIcon">
                      ⌖
                    </div>

                    <div className="resultText">
                      <b>
                        {suggestion
                          ?.structured_formatting
                          ?.main_text ||
                          suggestion.description}
                      </b>

                      <p>
                        {suggestion
                          ?.structured_formatting
                          ?.secondary_text ||
                          suggestion.description}
                      </p>
                    </div>

                    <span className="resultArrow">
                      ›
                    </span>
                  </button>
                )
              )}

            {!searching &&
              searchError && (
                <div className="mapSearchError">
                  {searchError}
                </div>
              )}
          </div>
        )}
      </div>

      <div
        className={`mapHintPill ${
          mapMoving ? "moving" : ""
        }`}
      >
        {resolvingPlace
          ? "Opening selected place..."
          : mapMoving
          ? "Finding this location..."
          : "Move map to set exact point"}
      </div>

      <div
        className={`premiumCenterPin ${
          isPickup ? "" : "dropPin"
        } ${
          mapMoving ? "pinMoving" : ""
        }`}
      >
        <div className="pinGlow" />
        <div className="pinShape">
          <span />
        </div>
        <div className="pinShadow" />
      </div>

      <div className="bottomConfirmGlass">
        <div className="selectedAddressArea">
          <div
            className={`miniTypePill ${
              isPickup ? "" : "dropPill"
            }`}
          >
            {isPickup
              ? "PICKUP LOCATION"
              : "DESTINATION"}
          </div>

          <h3>
            {resolvingPlace
              ? "Opening selected place..."
              : loadingAddress
              ? "Finding exact address..."
              : selectedLocation?.name ||
                "Move map to choose location"}
          </h3>

          <p>
            {mapMoving
              ? "Release the map to update address"
              : "Confirm this exact location"}
          </p>
        </div>

        <button
          type="button"
          className="confirmMapLocationButton"
          disabled={
            loadingAddress ||
            resolvingPlace ||
            !selectedLocation?.name ||
            selectedLocation.name ===
              "Address unavailable"
          }
          onClick={confirmLocation}
        >
          Confirm{" "}
          {isPickup
            ? "Pickup"
            : "Destination"}
        </button>
      </div>
    </div>
  );
}

export default LocationPicker;