const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5000"
        : "https://biashara-compliance-assistant-api.onrender.com";


const checklistForm = document.getElementById("checklistForm");
const countySelect = document.getElementById("county");
const businessTypeSelect = document.getElementById("businessType");
const businessNameInput = document.getElementById("businessName");
const generateButton = document.getElementById("generateButton");
const formStatus = document.getElementById("formStatus");
const emptyState = document.getElementById("emptyState");
const result = document.getElementById("result");
const checklistItems = document.getElementById("checklistItems");
const resultBusiness = document.getElementById("resultBusiness");
const resultLocation = document.getElementById("resultLocation");
const resultType = document.getElementById("resultType");
const disclaimerText = document.getElementById("disclaimerText");


function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function setStatus(message, type = "error") {
    formStatus.textContent = message;
    formStatus.dataset.type = type;
}


function clearStatus() {
    formStatus.textContent = "";
    delete formStatus.dataset.type;
}


async function requestJson(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error ||
            `Request failed with status ${response.status}.`
        );
    }

    return data;
}


function createCountyOptions(counties) {
    return `
        <option value="">Select a county</option>

        ${counties
            .map(
                (county) => `
                    <option value="${escapeHtml(county)}">
                        ${escapeHtml(county)}
                    </option>
                `
            )
            .join("")}
    `;
}


function createBusinessTypeOptions(businessTypes) {
    return `
        <option value="">Select a business type</option>

        ${businessTypes
            .map(
                (businessType) => `
                    <option value="${escapeHtml(businessType.id)}">
                        ${escapeHtml(businessType.name)}
                    </option>
                `
            )
            .join("")}
    `;
}


async function loadOptions() {
    countySelect.disabled = true;
    businessTypeSelect.disabled = true;
    generateButton.disabled = true;

    setStatus("Loading counties and business types...", "loading");

    try {
        const data = await requestJson("/api/options");

        const counties = Array.isArray(data.counties)
            ? data.counties
            : [];

        const businessTypes = Array.isArray(data.business_types)
            ? data.business_types
            : [];

        countySelect.innerHTML = createCountyOptions(counties);
        businessTypeSelect.innerHTML =
            createBusinessTypeOptions(businessTypes);

        countySelect.disabled = false;
        businessTypeSelect.disabled = false;
        generateButton.disabled = false;

        clearStatus();
    } catch (error) {
        countySelect.innerHTML = `
            <option value="">
                Counties unavailable
            </option>
        `;

        businessTypeSelect.innerHTML = `
            <option value="">
                Business types unavailable
            </option>
        `;

        setStatus(
            "The compliance database could not be loaded. " +
            "The free Render service may be starting up. " +
            "Refresh the page after a few seconds."
        );

        console.error("Options loading error:", error);
    }
}


function createDocumentsList(documents) {
    if (!Array.isArray(documents) || documents.length === 0) {
        return `
            <p class="item-note">
                No specific documents have been listed yet.
            </p>
        `;
    }

    return `
        <strong>Documents to prepare:</strong>

        <ul>
            ${documents
                .map(
                    (documentName) => `
                        <li>
                            ${escapeHtml(documentName)}
                        </li>
                    `
                )
                .join("")}
        </ul>
    `;
}


function createSourceLink(item) {
    if (!item.official_source_url) {
        return "";
    }

    const sourceUrl = escapeHtml(item.official_source_url);

    return `
        <p class="item-note">
            <strong>Official source:</strong>

            <a
                href="${sourceUrl}"
                target="_blank"
                rel="noopener noreferrer"
            >
                View official information
            </a>
        </p>
    `;
}


function createVerifiedDate(item) {
    if (!item.last_verified_date) {
        return "";
    }

    return `
        <p class="item-note">
            <strong>Last checked:</strong>
            ${escapeHtml(item.last_verified_date)}
        </p>
    `;
}


function createChecklistItem(item, index) {
    return `
        <article
            class="checklist-item"
            style="animation-delay: ${index * 60}ms"
        >
            <h3>${escapeHtml(item.title)}</h3>

            <div class="item-meta">
                <span class="badge">
                    ${escapeHtml(item.category)}
                </span>

                <span class="badge">
                    ${escapeHtml(item.source_scope)}
                </span>

                <span class="badge warning">
                    ${escapeHtml(item.verification)}
                </span>
            </div>

            <p>
                ${escapeHtml(item.description)}
            </p>

            ${createDocumentsList(item.documents)}

            <p class="item-note">
                <strong>Renewal:</strong>
                ${escapeHtml(item.renewal_note)}
            </p>

            <p class="item-note">
                <strong>Fees:</strong>
                ${escapeHtml(item.fee_note)}
            </p>

            ${createVerifiedDate(item)}
            ${createSourceLink(item)}
        </article>
    `;
}


function renderEmptyChecklist() {
    checklistItems.innerHTML = `
        <div class="empty-state">
            <p>
                No compliance requirements are currently available
                for this selection.
            </p>
        </div>
    `;
}


function renderChecklist(data) {
    resultBusiness.textContent =
        data.business_name || "Your business";

    resultLocation.textContent =
        data.county || "Not specified";

    resultType.textContent =
        data.business_type || "Not specified";

    disclaimerText.textContent =
        data.disclaimer || "";

    const checklist = Array.isArray(data.checklist)
        ? data.checklist
        : [];

    if (checklist.length === 0) {
        renderEmptyChecklist();
    } else {
        checklistItems.innerHTML = checklist
            .map(createChecklistItem)
            .join("");
    }

    emptyState.hidden = true;
    result.hidden = false;

    result.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function validateForm() {
    if (!countySelect.value) {
        setStatus("Select a county.");
        countySelect.focus();
        return false;
    }

    if (!businessTypeSelect.value) {
        setStatus("Select a business type.");
        businessTypeSelect.focus();
        return false;
    }

    return true;
}


checklistForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearStatus();

    if (!validateForm()) {
        return;
    }

    generateButton.disabled = true;
    generateButton.textContent = "Generating checklist...";

    try {
        const data = await requestJson(
            "/api/checklist",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    business_name:
                        businessNameInput.value.trim(),

                    county:
                        countySelect.value,

                    business_type:
                        businessTypeSelect.value
                })
            }
        );

        renderChecklist(data);

        setStatus(
            "Compliance checklist generated successfully.",
            "success"
        );
    } catch (error) {
        setStatus(
            error.message ||
            "The checklist could not be generated."
        );

        console.error(
            "Checklist generation error:",
            error
        );
    } finally {
        generateButton.disabled = false;
        generateButton.textContent = "Generate checklist";
    }
});


loadOptions();