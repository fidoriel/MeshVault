let backendBaseUrl = import.meta.env.VITE_BACKEND_URL || "";

if (backendBaseUrl.endsWith("/")) {
    backendBaseUrl = backendBaseUrl.slice(0, -1);
}

export const BACKEND_BASE_URL = backendBaseUrl;
