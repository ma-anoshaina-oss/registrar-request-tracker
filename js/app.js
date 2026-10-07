// app.js
// Main logic: connects the page (HTML) with storage.js and utils.js.

// ===== Page elements =====
const requestForm = document.getElementById("request-form");
const documentTypeSelect = document.getElementById("document-type");
const feePreview = document.getElementById("fee-preview");
const releasePreview = document.getElementById("release-preview");
const tableBody = document.getElementById("request-table-body");

// The ids of the form fields (used to clear and mark errors).
const FORM_FIELD_IDS = ["student-name", "student-id", "course", "document-type", "purpose"];

// A student cannot send the same document again while a request is in these statuses.
const ACTIVE_STATUSES = ["Submitted", "Processing"];

// ===== Small helpers =====

// Show a success or error message in a message box.
// type is "success" or "error".
function showMessage(elementId, type, text) {
  const box = document.getElementById(elementId);
  box.textContent = text;
  box.className = "message " + type;   // replaces "hidden", so the box appears
}

// Make text safe before putting it in HTML (prevents broken or injected HTML).
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== Fee and release date preview =====
function updatePreview() {
  const documentInfo = DOCUMENT_TYPES[documentTypeSelect.value];

  if (!documentInfo) {
    feePreview.textContent = "--";
    releasePreview.textContent = "--";
    return;
  }

  const releaseDate = addWorkingDays(new Date(), documentInfo.processingDays);
  feePreview.textContent = formatFee(documentInfo.fee);
  releasePreview.textContent = formatDate(toDateString(releaseDate));
}

// ===== Form validation =====

// Remove the red border from every form field.
function clearFieldErrors() {
  FORM_FIELD_IDS.forEach(function (id) {
    document.getElementById(id).classList.remove("input-error");
  });
}

// Read the form values into one object (text is trimmed).
function readRequestForm() {
  return {
    studentName: document.getElementById("student-name").value.trim(),
    studentId: document.getElementById("student-id").value.trim(),
    course: document.getElementById("course").value.trim(),
    documentType: documentTypeSelect.value,
    purpose: document.getElementById("purpose").value.trim()
  };
}

// Does this student already have an active request for the same document?
// Student IDs are compared without caring about upper/lower case.
function hasDuplicateRequest(requests, studentId, documentType) {
  return requests.some(function (request) {
    return request.studentId.toLowerCase() === studentId.toLowerCase() &&
      request.documentType === documentType &&
      ACTIVE_STATUSES.includes(request.status);
  });
}

// Check the form data. Returns a list of errors.
// Each error is { fieldId, message }. An empty list means the data is valid.
function validateRequestForm(data, requests) {
  const errors = [];

  function addError(fieldId, message) {
    errors.push({ fieldId: fieldId, message: message });
  }

  // Student name
  if (data.studentName === "") {
    addError("student-name", "Student name is required.");
  } else if (data.studentName.length < 2 || data.studentName.length > 60) {
    addError("student-name", "Student name must be 2 to 60 characters long.");
  } else if (!/^[A-Za-z\u00D1\u00F1][A-Za-z\u00D1\u00F1 .'-]*$/.test(data.studentName)) {
    addError("student-name", "Student name may only contain letters, spaces, periods, hyphens, and apostrophes.");
  }

  // Student ID (format like 2026-001)
  if (data.studentId === "") {
    addError("student-id", "Student ID is required.");
  } else if (!/^\d{4}-\d{3,5}$/.test(data.studentId)) {
    addError("student-id", "Student ID must look like 2026-001 (4 digits, a dash, then 3 to 5 digits).");
  }

  // Course
  if (data.course === "") {
    addError("course", "Course is required.");
  } else if (data.course.length < 2 || data.course.length > 50) {
    addError("course", "Course must be 2 to 50 characters long.");
  } else if (!/^[A-Za-z0-9 .&-]+$/.test(data.course)) {
    addError("course", "Course may only contain letters, numbers, spaces, periods, hyphens, and &.");
  }

  // Document type (must be one of the 3 real document types)
  if (data.documentType === "") {
    addError("document-type", "Please select a document type.");
  } else if (!Object.prototype.hasOwnProperty.call(DOCUMENT_TYPES, data.documentType)) {
    addError("document-type", "The selected document type is not valid.");
  }

  // Purpose
  if (data.purpose === "") {
    addError("purpose", "Purpose is required.");
  } else if (data.purpose.length < 5 || data.purpose.length > 200) {
    addError("purpose", "Purpose must be 5 to 200 characters long.");
  }

  // Duplicate check. Only done when the ID and document type are already valid.
  if (errors.length === 0 && hasDuplicateRequest(requests, data.studentId, data.documentType)) {
    addError(
      "document-type",
      "Student ID " + data.studentId + " already has a " + data.documentType +
      " request that is still Submitted or Processing. Please wait until it is finished."
    );
  }

  return errors;
}

// Show all validation errors in the message box and mark the bad fields in red.
function showValidationErrors(errors) {
  const lines = errors.map(function (error) {
    document.getElementById(error.fieldId).classList.add("input-error");
    return "\u2022 " + error.message;
  });

  showMessage("request-message", "error", "Please fix the following:\n" + lines.join("\n"));
}

// ===== Create a request =====
function handleRequestSubmit(event) {
  event.preventDefault();   // stop the page from reloading
  clearFieldErrors();

  const requests = getRequests();
  const formData = readRequestForm();

  // Stop here if anything is wrong. Nothing is saved.
  const errors = validateRequestForm(formData, requests);
  if (errors.length > 0) {
    showValidationErrors(errors);
    return;
  }

  const documentInfo = DOCUMENT_TYPES[formData.documentType];
  const today = new Date();

  const newRequest = {
    referenceNumber: generateReferenceNumber(requests),
    studentName: formData.studentName,
    studentId: formData.studentId,
    course: formData.course,
    documentType: formData.documentType,
    purpose: formData.purpose,
    dateRequested: toDateString(today),
    status: "Submitted",
    expectedReleaseDate: toDateString(addWorkingDays(today, documentInfo.processingDays)),
    claimDate: "",
    rejectionReason: "",
    fee: documentInfo.fee
  };

  requests.push(newRequest);
  saveRequests(requests);

  showMessage(
    "request-message",
    "success",
    "Request submitted! Your reference number is " + newRequest.referenceNumber +
    ". Please keep it to check your status."
  );

  requestForm.reset();
  updatePreview();          // reset() does not trigger the change event
  renderRegistrarTable();
}

// ===== Status rules =====

// Is moving from currentStatus to newStatus allowed?
function isValidTransition(currentStatus, newStatus) {
  const allowedStatuses = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedStatuses.includes(newStatus);
}

// Change the status of one request, following all the rules.
function changeStatus(referenceNumber, newStatus) {
  const requests = getRequests();
  const request = requests.find(function (item) {
    return item.referenceNumber === referenceNumber;
  });

  // Rule 0: the request must exist.
  if (!request) {
    showMessage("registrar-message", "error", "Request " + referenceNumber + " was not found.");
    return;
  }

  // Rule 1: the move must follow the allowed status flow.
  // This also blocks claiming unless the status is "Ready for Pickup".
  if (!isValidTransition(request.status, newStatus)) {
    showMessage(
      "registrar-message",
      "error",
      "Cannot change " + request.referenceNumber + " from " + request.status +
      " to " + newStatus + "."
    );
    return;
  }

  // Rule 2: rejecting needs a reason.
  if (newStatus === "Rejected") {
    const reason = window.prompt("Enter the reason for rejecting " + request.referenceNumber + ":");

    if (reason === null || reason.trim() === "") {
      showMessage("registrar-message", "error", "A rejection reason is required. The request was not rejected.");
      return;
    }

    request.rejectionReason = reason.trim();
  }

  // Rule 3: claiming saves today's date as the claim date.
  if (newStatus === "Claimed") {
    request.claimDate = toDateString(new Date());
  }

  request.status = newStatus;
  saveRequests(requests);

  showMessage(
    "registrar-message",
    "success",
    request.referenceNumber + " is now " + newStatus + "."
  );
  renderRegistrarTable();
}

// ===== Action buttons =====

// Build the buttons for one request. Only allowed moves get a button.
function getActionButtons(request) {
  const allowedStatuses = STATUS_TRANSITIONS[request.status] || [];

  if (allowedStatuses.length === 0) {
    return "--";   // Claimed and Rejected are final
  }

  const buttonStyles = {
    "Processing": { label: "Start Processing", cssClass: "btn-process" },
    "Ready for Pickup": { label: "Mark Ready", cssClass: "btn-ready" },
    "Claimed": { label: "Mark Claimed", cssClass: "btn-claim" },
    "Rejected": { label: "Reject", cssClass: "btn-reject" }
  };

  let buttons = "";

  allowedStatuses.forEach(function (status) {
    const style = buttonStyles[status];
    buttons += '<button type="button" class="btn btn-small ' + style.cssClass + '"' +
      ' data-reference="' + escapeHtml(request.referenceNumber) + '"' +
      ' data-status="' + status + '">' + style.label + "</button>";
  });

  return buttons;
}

// One click listener for the whole table (event delegation).
function handleTableClick(event) {
  const button = event.target.closest("button[data-status]");

  if (!button) {
    return;   // the click was not on an action button
  }

  changeStatus(button.dataset.reference, button.dataset.status);
}

// ===== Registrar table =====
function renderRegistrarTable() {
  const requests = getRequests();

  if (requests.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="11" class="empty-row">No requests yet.</td></tr>';
    return;
  }

  let rows = "";

  requests.forEach(function (request) {
    // "Ready for Pickup" -> "badge-ready-for-pickup"
    const badgeClass = "badge-" + request.status.toLowerCase().replace(/ /g, "-");

    // Show the rejection reason under the badge for rejected requests.
    let reasonHtml = "";
    if (request.status === "Rejected" && request.rejectionReason) {
      reasonHtml = '<span class="reject-reason">Reason: ' + escapeHtml(request.rejectionReason) + "</span>";
    }

    rows += "<tr>" +
      "<td>" + escapeHtml(request.referenceNumber) + "</td>" +
      "<td>" + escapeHtml(request.studentName) + "</td>" +
      "<td>" + escapeHtml(request.studentId) + "</td>" +
      "<td>" + escapeHtml(request.course) + "</td>" +
      "<td>" + escapeHtml(request.documentType) + "</td>" +
      "<td>" + escapeHtml(request.purpose) + "</td>" +
      "<td>" + formatDate(request.dateRequested) + "</td>" +
      '<td><span class="badge ' + badgeClass + '">' + escapeHtml(request.status) + "</span>" + reasonHtml + "</td>" +
      "<td>" + formatDate(request.expectedReleaseDate) + "</td>" +
      "<td>" + formatDate(request.claimDate) + "</td>" +
      "<td>" + getActionButtons(request) + "</td>" +
      "</tr>";
  });

  tableBody.innerHTML = rows;
}

// ===== Start the app =====
documentTypeSelect.addEventListener("change", updatePreview);
requestForm.addEventListener("submit", handleRequestSubmit);
tableBody.addEventListener("click", handleTableClick);

renderRegistrarTable();   // show saved requests when the page loads or refreshes