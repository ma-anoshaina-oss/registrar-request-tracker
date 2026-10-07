// utils.js
// Helper functions: document types, working days, reference numbers, formatting.

// The three document types with their fee and processing time.
const DOCUMENT_TYPES = {
  "Certificate of Enrollment": { fee: 50, processingDays: 2 },
  "Transcript of Records": { fee: 150, processingDays: 5 },
  "Good Moral Certificate": { fee: 100, processingDays: 3 }
};

// Add working days (Monday to Friday only) to a date.
// Counting starts the day AFTER the start date. Saturday and Sunday are skipped.
function addWorkingDays(startDate, days) {
  const result = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);   // move forward one day
    const dayOfWeek = result.getDay();      // 0 = Sunday, 6 = Saturday

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;                          // only weekdays are counted
    }
  }

  return result;
}

// Convert a Date to text like "2026-10-07" (using the local date).
function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Convert "2026-10-07" to a readable date like "Wed, Oct 7, 2026".
function formatDate(dateString) {
  if (!dateString) {
    return "--";
  }

  const parts = dateString.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// Show a fee with the peso sign, e.g. 50 -> "₱50".
function formatFee(amount) {
  return "\u20B1" + amount;   // \u20B1 is the peso sign
}

// Generate the next reference number, e.g. "REQ-2026-0001".
function generateReferenceNumber(requests) {
  const year = new Date().getFullYear();
  const prefix = "REQ-" + year + "-";
  let highestNumber = 0;

  // Find the highest number already used this year.
  requests.forEach(function (request) {
    if (request.referenceNumber.startsWith(prefix)) {
      const number = parseInt(request.referenceNumber.slice(prefix.length), 10);
      if (number > highestNumber) {
        highestNumber = number;
      }
    }
  });

  // Add 1 and pad with zeros to 4 digits.
  return prefix + String(highestNumber + 1).padStart(4, "0");
}