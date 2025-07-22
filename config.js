const isLocal = window.location.hostname === "127.0.0.1" ||
                window.location.hostname === "localhost" ||
                window.location.hostname === "";

const BASE_URL = isLocal
  ? "http://127.0.0.1:5000"
  : "https://godesignapi-production.up.railway.app";
