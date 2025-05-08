// API configuration constants
const API_BASE = "http://localhost:3000";
const LOGIN_ENDPOINT = "/api/auth/login";
const REGISTER_ENDPOINT = "/api/auth/register";
const SIGNOUT_ENDPOINT = "/api/auth/signout";
const PROFILE_ENDPOINT = "/api/auth/profile";

// Redirect configuration constants
const REDIRECT_AFTER_LOGIN = "/home.html";
const REDIRECT_IF_AUTHENTICATED = "/home.html";
const REDIRECT_IF_NOT_AUTHENTICATED = "public.html";