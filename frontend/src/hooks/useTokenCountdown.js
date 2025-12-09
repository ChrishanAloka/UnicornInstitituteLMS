import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const useTokenCountdown = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const expiry = decoded.exp * 1000; // Convert to milliseconds
      let timeRemaining = Math.max(0, expiry - Date.now());

      setTimeLeft(timeRemaining);

      const interval = setInterval(() => {
        const updatedTimeLeft = timeRemaining - 1000;

        if (updatedTimeLeft <= 0) {
          clearInterval(interval);
          localStorage.removeItem("token");
          navigate("/");
          alert("Session expired. Please log in again.");
        } else {
          timeRemaining = updatedTimeLeft;
          setTimeLeft(updatedTimeLeft);
        }
      }, 1000);

      return () => clearInterval(interval);
    } catch (err) {
      console.error("Invalid token:", err.message);
      localStorage.removeItem("token");
      navigate("/");
    }
  }, []);

  // Format time as hh:mm:ss
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  return formatTime(timeLeft);
};

export default useTokenCountdown;