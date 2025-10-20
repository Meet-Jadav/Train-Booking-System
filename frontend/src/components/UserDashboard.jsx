import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const UserDashboard = () => {
  const { user, logout, API_BASE } = useAuth();
  const navigate = useNavigate();
  const [trains, setTrains] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stations, setStations] = useState({ sources: [], destinations: [] });
  const [searchParams, setSearchParams] = useState({
    source: "",
    destination: "",
    date: "",
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch stations
        const stationsResponse = await axios.get(`${API_BASE}/stations`);
        setStations(stationsResponse.data);
        
        // Fetch bookings
        const bookingsResponse = await axios.get(`${API_BASE}/bookings`);
        setBookings(bookingsResponse.data);
        
        // Fetch all available trains
        const trainsResponse = await axios.get(`${API_BASE}/trains`);
        setTrains(trainsResponse.data);
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };
    
    loadInitialData();
  }, [API_BASE]);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const searchTrains = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchParams.source) params.append("source", searchParams.source);
      if (searchParams.destination)
        params.append("destination", searchParams.destination);
      if (searchParams.date) params.append("date", searchParams.date);

      const response = await axios.get(`${API_BASE}/trains?${params}`);
      setTrains(response.data);
    } catch (error) {
      console.error("Error searching trains:", error);
    }
    setLoading(false);
  };

  const bookTrain = async (trainId, passengers) => {
    try {
      await axios.post(`${API_BASE}/bookings`, {
        train_id: trainId,
        passengers_count: passengers,
        payment_method: "credit_card",
      });
      alert("Booking successful!");
      fetchBookings();
      searchTrains();
    } catch (error) {
      alert(
        "Booking failed: " + (error.response?.data?.detail || "Unknown error")
      );
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login"); // Redirect after logout
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Train Booking System</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <div className="nav-content">
          <button
            onClick={() => setActiveTab("search")}
            className={`nav-button ${activeTab === "search" ? "active" : ""}`}
          >
            Search Trains
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`nav-button ${activeTab === "bookings" ? "active" : ""}`}
          >
            My Bookings
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        {activeTab === "search" && (
          <div className="tab-content">
            <div className="card">
              <h2>Search Trains</h2>

              <div className="search-form">
                <div className="form-group">
                  <label>From Station</label>
                  <select
                    value={searchParams.source}
                    onChange={(e) =>
                      setSearchParams({
                        ...searchParams,
                        source: e.target.value,
                      })
                    }
                    className="form-input"
                  >
                    <option value="">Select Source Station</option>
                    {stations.sources.map((station) => (
                      <option key={station} value={station}>
                        {station}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>To Station</label>
                  <select
                    value={searchParams.destination}
                    onChange={(e) =>
                      setSearchParams({
                        ...searchParams,
                        destination: e.target.value,
                      })
                    }
                    className="form-input"
                  >
                    <option value="">Select Destination Station</option>
                    {stations.destinations.map((station) => (
                      <option key={station} value={station}>
                        {station}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={searchParams.date}
                    onChange={(e) =>
                      setSearchParams({ ...searchParams, date: e.target.value })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <button
                    onClick={searchTrains}
                    disabled={loading}
                    className="search-button"
                  >
                    {loading ? "Searching..." : "Search Trains"}
                  </button>
                </div>
              </div>

              <div className="flights-list">
                {trains.map((train) => (
                  <div key={train.train_id} className="flight-card">
                    <div className="flight-info">
                      <h3>{train.train_number} - {train.train_name}</h3>
                      <p className="route">
                        {train.source_station} → {train.destination_station}
                      </p>
                      <p className="flight-time">
                        Departure:{" "}
                        {new Date(train.departure_time).toLocaleString()}
                      </p>
                      <p className="flight-time">
                        Arrival:{" "}
                        {new Date(train.arrival_time).toLocaleString()}
                      </p>
                      <p className="flight-time">
                        Type: {train.train_type}
                      </p>
                    </div>

                    <div className="flight-actions">
                      <p className="flight-price">₹{train.base_fare}</p>
                      <p className="flight-seats">
                        {train.available_seats} seats available
                      </p>
                      <button
                        onClick={() => {
                          const passengers = prompt(
                            "Enter number of passengers:"
                          );
                          if (passengers && !isNaN(passengers)) {
                            bookTrain(train.train_id, parseInt(passengers));
                          }
                        }}
                        className="book-button"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}

                {trains.length === 0 && !loading && (
                  <p className="no-results">
                    No trains found. Try different search criteria.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="tab-content">
            <div className="card">
              <h2>My Bookings</h2>

              <div className="bookings-list">
                {bookings.map((booking) => (
                  <div key={booking.booking_id} className="booking-card">
                    <div className="booking-info">
                      <h3>PNR: {booking.pnr_number}</h3>
                      {booking.train && (
                        <>
                          <p className="route">
                            <strong>{booking.train.train_number} - {booking.train.train_name}</strong>
                          </p>
                          <p className="route">
                            {booking.train.source_station} → {booking.train.destination_station}
                          </p>
                          <p className="booking-detail">
                            <strong>Departure:</strong> {new Date(booking.train.departure_time).toLocaleString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="booking-detail">
                            <strong>Arrival:</strong> {new Date(booking.train.arrival_time).toLocaleString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="booking-detail">
                            <strong>Type:</strong> {booking.train.train_type}
                          </p>
                        </>
                      )}
                      <p className="booking-detail">
                        <strong>Passengers:</strong> {booking.passengers_count}
                      </p>
                      <p className="booking-time">
                        <strong>Booked on:</strong>{" "}
                        {new Date(booking.booking_date).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="booking-status">
                        Status:{" "}
                        <span className={`status-${booking.booking_status}`}>
                          {booking.booking_status}
                        </span>
                      </p>
                    </div>

                    <div className="booking-actions">
                      <p className="booking-amount">₹{booking.total_amount}</p>
                      <p className="payment-status">
                        Payment: {booking.payment_status}
                      </p>
                    </div>
                  </div>
                ))}

                {bookings.length === 0 && (
                  <p className="no-results">No bookings found.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserDashboard;
