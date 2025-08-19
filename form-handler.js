// Enhanced Form Handler with better error handling and retry logic

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxDzYxMyyXyxgFBZ8fNGUBWD0RItaJvG7tSNxQ8UzqW29hkmRRuxrEpJyo7T6oKpPii/exec";

// Configuration
const CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  timeout: 10000, // 10 seconds
  fallbackEndpoints: [
    // Add backup endpoints if needed
    // "https://your-backup-endpoint.com/api/orders"
  ],
};

/**
 * Submit order data to Google Sheets with enhanced error handling
 * @param {Object} formData - The form data to submit
 * @returns {Promise<Object>} - Response from the server
 */
async function submitOrderToGoogleSheets(formData) {
  // Validate form data before sending
  if (!validateFormData(formData)) {
    throw new Error("Invalid form data provided");
  }

  // Add metadata to the form data
  const enrichedData = {
    ...formData,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    sessionId: generateSessionId(),
    source: "night_canteen_app",
  };

  let lastError;

  // Try main endpoint with retries
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      console.log(
        `Attempting to submit order (attempt ${attempt}/${CONFIG.maxRetries})`
      );

      const response = await submitWithTimeout(
        GOOGLE_SCRIPT_URL,
        enrichedData,
        CONFIG.timeout
      );

      if (response.ok || response.status === 200) {
        console.log("Order submitted successfully");

        // Store successful submission in localStorage for offline recovery
        storeSuccessfulSubmission(enrichedData);

        return await handleResponse(response);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`Submission attempt ${attempt} failed:`, error.message);
      lastError = error;

      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        break;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < CONFIG.maxRetries) {
        const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  // Try fallback endpoints if main endpoint fails
  if (CONFIG.fallbackEndpoints.length > 0) {
    console.log("Trying fallback endpoints...");

    for (const endpoint of CONFIG.fallbackEndpoints) {
      try {
        const response = await submitWithTimeout(
          endpoint,
          enrichedData,
          CONFIG.timeout
        );
        if (response.ok) {
          console.log("Order submitted via fallback endpoint");
          return await handleResponse(response);
        }
      } catch (error) {
        console.warn("Fallback endpoint failed:", error.message);
      }
    }
  }

  // Store failed submission for later retry
  storeFailedSubmission(enrichedData);

  // All attempts failed
  throw new Error(
    `Failed to submit order after ${CONFIG.maxRetries} attempts. Last error: ${lastError.message}`
  );
}

/**
 * Submit data with timeout
 */
function submitWithTimeout(url, data, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const formData = new FormData();

  // Handle different data types properly
  for (let key in data) {
    if (data[key] !== null && data[key] !== undefined) {
      if (typeof data[key] === "object") {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, String(data[key]));
      }
    }
  }

  return fetch(url, {
    method: "POST",
    body: formData,
    signal: controller.signal,
    headers: {
      Accept: "application/json",
    },
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Handle the response from the server
 */
async function handleResponse(response) {
  try {
    // Try to parse as JSON first
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      // Handle text response (common with Google Apps Script)
      const textData = await response.text();

      // Try to parse text as JSON (Google Apps Script sometimes returns JSON as text)
      try {
        return JSON.parse(textData);
      } catch {
        return { success: true, message: textData };
      }
    }
  } catch (error) {
    console.warn("Failed to parse response:", error);
    return { success: true, message: "Order submitted successfully" };
  }
}

/**
 * Validate form data before submission
 */
function validateFormData(data) {
  if (!data || typeof data !== "object") {
    console.error("Form data must be an object");
    return false;
  }

  // Check for required fields based on data type
  if (data.feedback) {
    return typeof data.feedback === "string" && data.feedback.trim().length > 0;
  }

  // Validate order data
  const requiredFields = ["name", "room", "mobile"];
  for (const field of requiredFields) {
    if (
      !data[field] ||
      typeof data[field] !== "string" ||
      data[field].trim().length === 0
    ) {
      console.error(`Missing or invalid required field: ${field}`);
      return false;
    }
  }

  // Validate mobile number
  const mobileRegex = /^\d{10}$/;
  const cleanMobile = data.mobile.replace(/\s+/g, "");
  if (!mobileRegex.test(cleanMobile)) {
    console.error("Invalid mobile number format");
    return false;
  }

  // Validate order items
  if (data.items && (!Array.isArray(data.items) || data.items.length === 0)) {
    console.error("Order must contain at least one item");
    return false;
  }

  // Validate total amount
  if (
    data.total !== undefined &&
    (typeof data.total !== "number" || data.total <= 0)
  ) {
    console.error("Invalid total amount");
    return false;
  }

  return true;
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error) {
  const nonRetryableMessages = [
    "Invalid form data",
    "Validation failed",
    "Unauthorized",
    "Forbidden",
  ];

  return nonRetryableMessages.some((msg) =>
    error.message.toLowerCase().includes(msg.toLowerCase())
  );
}

/**
 * Generate a unique session ID for tracking
 */
function generateSessionId() {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

/**
 * Store successful submission for analytics
 */
function storeSuccessfulSubmission(data) {
  try {
    const submissions = JSON.parse(
      sessionStorage.getItem("successful_submissions") || "[]"
    );
    submissions.push({
      timestamp: new Date().toISOString(),
      type: data.feedback ? "feedback" : "order",
      success: true,
    });

    // Keep only last 10 submissions
    const recent = submissions.slice(-10);
    sessionStorage.setItem("successful_submissions", JSON.stringify(recent));
  } catch (error) {
    console.warn("Failed to store successful submission:", error);
  }
}

/**
 * Store failed submission for retry later
 */
function storeFailedSubmission(data) {
  try {
    const failed = JSON.parse(
      sessionStorage.getItem("failed_submissions") || "[]"
    );
    failed.push({
      timestamp: new Date().toISOString(),
      data: data,
      attempts: CONFIG.maxRetries,
    });

    // Keep only last 5 failed submissions
    const recent = failed.slice(-5);
    sessionStorage.setItem("failed_submissions", JSON.stringify(recent));

    console.log("Failed submission stored for potential retry");
  } catch (error) {
    console.warn("Failed to store failed submission:", error);
  }
}

/**
 * Retry failed submissions (can be called on app initialization)
 */
async function retryFailedSubmissions() {
  try {
    const failed = JSON.parse(
      sessionStorage.getItem("failed_submissions") || "[]"
    );
    if (failed.length === 0) return;

    console.log(`Retrying ${failed.length} failed submissions...`);

    const stillFailed = [];

    for (const submission of failed) {
      try {
        await submitOrderToGoogleSheets(submission.data);
        console.log("Successfully retried failed submission");
      } catch (error) {
        console.warn("Retry failed, keeping for later:", error.message);
        stillFailed.push(submission);
      }
    }

    // Update failed submissions list
    sessionStorage.setItem("failed_submissions", JSON.stringify(stillFailed));
  } catch (error) {
    console.warn("Error during retry process:", error);
  }
}

/**
 * Get submission statistics
 */
function getSubmissionStats() {
  try {
    const successful = JSON.parse(
      sessionStorage.getItem("successful_submissions") || "[]"
    );
    const failed = JSON.parse(
      sessionStorage.getItem("failed_submissions") || "[]"
    );

    return {
      successful: successful.length,
      failed: failed.length,
      total: successful.length + failed.length,
      successRate: successful.length / (successful.length + failed.length) || 0,
    };
  } catch (error) {
    console.warn("Error getting submission stats:", error);
    return { successful: 0, failed: 0, total: 0, successRate: 0 };
  }
}

/**
 * Utility function to sleep/wait
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize retry mechanism when the page loads
document.addEventListener("DOMContentLoaded", function () {
  // Retry failed submissions from previous sessions
  setTimeout(() => {
    retryFailedSubmissions();
  }, 2000); // Wait 2 seconds after page load
});

// Expose functions for debugging (remove in production)
if (typeof window !== "undefined") {
  window.formHandlerDebug = {
    getStats: getSubmissionStats,
    retryFailed: retryFailedSubmissions,
    config: CONFIG,
  };
}
