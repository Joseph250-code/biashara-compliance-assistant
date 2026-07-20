const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5000"
        : "https://YOUR-BACKEND-NAME.onrender.com";

const checklistForm = document.getElementById("checklistForm");
const countySelect = document.getElementById("county");
const businessTypeSelect = document.getElementById("businessType");
const businessNameInput = document.getElementById("businessName");
const generateButton = document.getElementById("generateButton");
const formStatus = document.getElementById("formStatus");
const emptyState = document.getElementById("emptyState");
const result = document.getElementById("result");
const checklistItems = document.getElementById("checklistItems");

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function requestJson(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "The request could not be completed.");
    }

    return data;
}

async function loadOptions() {
    formStatus.textContent = "Loading options...";

    try {
        const data = await requestJson("/api/options");

        countySelect.innerHTML = `
            <option value="">Select a county</option>
            ${data.counties
                .map((county) => `<option value="${escapeHtml(county)}">${escapeHtml(county)}</option>`)
                .join("")}
        `;

        businessTypeSelect.innerHTML = `
            <option value="">Select a business type</option>
            ${data.business_types
                .map((business) => `<option value="${escapeHtml(business.id)}">${escapeHtml(business.name)}</option>`)
                .join("")}
        `;

        formStatus.textContent = "";
    } catch (error) {
        formStatus.textContent = "Could not load the compliance options. Confirm that the backend is running.";
    }
}

function renderChecklist(data) {
    document.getElementById("resultBusiness").textContent = data.business_name;
    document.getElementById("resultLocation").textContent = data.county;
    document.getElementById("resultType").textContent = data.business_type;
    document.getElementById("disclaimerText").textContent = data.disclaimer;

    checklistItems.innerHTML = data.checklist
        .map(
            (item, index) => `
                <article class="checklist-item" style="animation-delay:${index * 60}ms">
                    <h3>${escapeHtml(item.title)}</h3>
                    <div class="item-meta">
                        <span class="badge">${escapeHtml(item.category)}</span>
                        <span class="badge">${escapeHtml(item.source_scope)}</span>
                        <span class="badge warning">${escapeHtml(item.verification)}</span>
                    </div>
                    <p>${escapeHtml(item.description)}</p>
                    <strong>Prepare:</strong>
                    <ul>
                        ${item.documents.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}
                    </ul>
                    <p class="item-note"><strong>Renewal:</strong> ${escapeHtml(item.renewal_note)}</p>
                    <p class="item-note"><strong>Fees:</strong> ${escapeHtml(item.fee_note)}</p>
                </article>
            `
        )
        .join("");

    emptyState.hidden = true;
    result.hidden = false;
}

checklistForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    formStatus.textContent = "";
    generateButton.disabled = true;
    generateButton.textContent = "Generating...";

    try {
        const data = await requestJson("/api/checklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                business_name: businessNameInput.value.trim(),
                county: countySelect.value,
                business_type: businessTypeSelect.value
            })
        });

        renderChecklist(data);
    } catch (error) {
        formStatus.textContent = error.message;
    } finally {
        generateButton.disabled = false;
        generateButton.textContent = "Generate checklist";
    }
});

loadOptions();
