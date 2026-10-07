// app.js
// Main logic: connects the page (HTML) with storage.js and utils.js.

// ===== Page elements =====
const requestForm = document.getElementById("request-form");
const documentTypeSelect = document.getElementById("document-type");
const feePreview = document.getElementById("fee-preview");
const releasePreview = document.getElementById("release-preview");
const tableBody = document.getElementById("request-table-body");

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

// ===== Create a request =====
function handleRequestSubmit(event) {
  event.preventDefault();   // stop the page from reloading

  const documentType = documentTypeSelect.value;
  const documentInfo = DOCUMENT_TYPES[documentType];

  // Temporary safety check. Full validation comes in Step 8.
  if (!documentInfo) {
    showMessage("request-message", "error", "Please select a document type.");
    return;
  }

  const requests = getRequests();
  const today = new Date();

  const newRequest = {
    referenceNumber: generateReferenceNumber(requests),
    studentName: document.getElementById("student-name").value.trim(),
    studentId: document.getElementById("student-id").value.trim(),
    course: document.getElementById("course").value.trim(),
    documentType: documentType,
    purpose: document.getElementById("purpose").value.trim(),
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

    rows += "<tr>" +
      "<td>" + escapeHtml(request.referenceNumber) + "</td>" +
      "<td>" + escapeHtml(request.studentName) + "</td>" +
      "<td>" + escapeHtml(request.studentId) + "</td>" +
      "<td>" + escapeHtml(request.course) + "</td>" +
      "<td>" + escapeHtml(request.documentType) + "</td>" +
      "<td>" + escapeHtml(request.purpose) + "</td>" +
      "<td>" + formatDate(request.dateRequested) + "</td>" +
      '<td><span class="badge ' + badgeClass + '">' + escapeHtml(request.status) + "</span></td>" +
      "<td>" + formatDate(request.expectedReleaseDate) + "</td>" +
      "<td>" + formatDate(request.claimDate) + "</td>" +
      "<td>--</td>" +   // action buttons are added in Step 7
      "</tr>";
  });

  tableBody.innerHTML = rows;
}

// ===== Start the app =====
documentTypeSelect.addEventListener("change", updatePreview);
requestForm.addEventListener("submit", handleRequestSubmit);

renderRegistrarTable();   // show saved requests when the page loads or refreshes