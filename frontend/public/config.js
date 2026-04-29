// Runtime configuration - loaded by the frontend at startup
window.APP_CONFIG = {
  API_BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:5000'
    : `http://${window.location.hostname}:5000`
};
