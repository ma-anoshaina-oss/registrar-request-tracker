// storage.js
// The ONLY file that reads from or writes to localStorage.

const STORAGE_KEY = "registrarRequests";

// Load all requests. Returns an empty list if nothing is saved yet.
function getRequests() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return [];
  }

  try {
    return JSON.parse(savedData);
  } catch (error) {
    // If the saved data is broken, start with an empty list instead of crashing.
    console.error("Could not read saved requests:", error);
    return [];
  }
}

// Save the full list of requests.
function saveRequests(requests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}