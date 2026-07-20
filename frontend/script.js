const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5000"
        : "https://biashara-compliance-assistant-api.onrender.com";


const checklistForm = document.getElementById("checklistForm");
const businessNameInput = document.getElementById("businessName");
const countySelect = document.getElementById("county");
const businessTypeInput = document.getElementById("businessType");
const businessTypeOptions = document.getElementById(
    "businessTypeOptions"
);
const generateButton = document.getElementById("generateButton");
const formStatus = document.getElementById("formStatus");

const emptyState = document.getElementById("emptyState");
const result = document.getElementById("result");
const checklistItems = document.getElementById("checklistItems");
const checklistCount = document.getElementById("checklistCount");

const resultBusiness = document.getElementById("resultBusiness");
const resultLocation = document.getElementById("resultLocation");
const resultType = document.getElementById("resultType");
const disclaimerText = document.getElementById("disclaimerText");

const printButton = document.getElementById("printButton");
const resetButton = document.getElementById("resetButton");

const choiceChips = Array.from(
    document.querySelectorAll(".choice-chip")
);

let availableBusinessTypes = [];


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


function setFormLoading(isLoading) {
    countySelect.disabled = isLoading;
    businessTypeInput.disabled = isLoading;
    generateButton.disabled = isLoading;

    if (isLoading) {
        generateButton.innerHTML = `
            <span>Preparing checklist...</span>
            <span aria-hidden="true">…</span>
        `;
    } else {
        generateButton.innerHTML = `
            <span>Prepare my checklist</span>
            <span aria-hidden="true">→</span>
        `;
    }
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
            `The request failed with status ${response.status}.`
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
    return businessTypes
        .map(
            (businessType) => `
                <option value="${escapeHtml(businessType.name)}">
                    ${escapeHtml(businessType.name)}
                </option>
            `
        )
        .join("");
}


function selectDefaultCounty(counties) {
    const nairobi = counties.find(
        (county) => county.toLowerCase() === "nairobi"
    );

    if (nairobi) {
        countySelect.value = nairobi;
    }
}


async function loadOptions() {
    countySelect.disabled = true;
    businessTypeInput.disabled = true;
    generateButton.disabled = true;

    setStatus(
        "Loading counties and business categories...",
        "loading"
    );

    try {
        const data = await requestJson("/api/options");

        const counties = Array.isArray(data.counties)
            ? data.counties
            : [];

        availableBusinessTypes = Array.isArray(
            data.business_types
        )
            ? data.business_types
            : [];

        countySelect.innerHTML =
            createCountyOptions(counties);

        businessTypeOptions.innerHTML =
            createBusinessTypeOptions(
                availableBusinessTypes
            );

        selectDefaultCounty(counties);

        countySelect.disabled = false;
        businessTypeInput.disabled = false;
        generateButton.disabled = false;

        clearStatus();
    } catch (error) {
        countySelect.innerHTML = `
            <option value="">
                Counties unavailable
            </option>
        `;

        businessTypeOptions.innerHTML = "";

        setStatus(
            "The service could not load the compliance information. " +
            "The free server may be starting. Refresh the page shortly."
        );

        console.error("Options loading error:", error);
    }
}


function findKnownBusinessType(value) {
    const normalizedValue = value.trim().toLowerCase();

    return availableBusinessTypes.find(
        (businessType) =>
            businessType.name.toLowerCase() ===
                normalizedValue ||
            businessType.id.toLowerCase() ===
                normalizedValue
    );
}


function updateActiveChoice() {
    const enteredValue =
        businessTypeInput.value.trim().toLowerCase();

    const knownBusinessType =
        findKnownBusinessType(enteredValue);

    choiceChips.forEach((chip) => {
        const chipSlug =
            chip.dataset.businessType.toLowerCase();

        chip.classList.toggle(
            "is-active",
            knownBusinessType?.id.toLowerCase() ===
                chipSlug
        );
    });
}


function handleChoiceClick(event) {
    const selectedSlug =
        event.currentTarget.dataset.businessType;

    const matchingBusinessType =
        availableBusinessTypes.find(
            (businessType) =>
                businessType.id === selectedSlug
        );

    if (!matchingBusinessType) {
        setStatus(
            "That business category is not available yet."
        );

        return;
    }

    businessTypeInput.value =
        matchingBusinessType.name;

    updateActiveChoice();
    clearStatus();

    businessTypeInput.focus();
}


function getBusinessTypeForRequest() {
    const enteredValue =
        businessTypeInput.value.trim();

    const knownBusinessType =
        findKnownBusinessType(enteredValue);

    return knownBusinessType
        ? knownBusinessType.id
        : enteredValue;
}


function createDocumentsList(documents) {
    if (
        !Array.isArray(documents) ||
        documents.length === 0
    ) {
        return `
            <p class="item-note">
                No specific supporting documents have been listed yet.
            </p>
        `;
    }

    return `
        <strong>Documents to prepare</strong>

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

    const sourceUrl =
        escapeHtml(item.official_source_url);

    return `
        <p class="item-note">
            <strong>Official source:</strong>

            <a
                href="${sourceUrl}"
                target="_blank"
                rel="noopener noreferrer"
            >
                Check the official information
            </a>
        </p>
    `;
}


function createVerifiedDate(item) {
    if (!item.last_verified_date) {
        return "";
    }

    const date = new Date(item.last_verified_date);

    const formattedDate =
        Number.isNaN(date.getTime())
            ? item.last_verified_date
            : new Intl.DateTimeFormat(
                "en-KE",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            ).format(date);

    return `
        <p class="item-note">
            <strong>Last checked:</strong>
            ${escapeHtml(formattedDate)}
        </p>
    `;
}


function createChecklistItem(item, index) {
    return `
        <article
            class="checklist-item"
            style="animation-delay: ${index * 70}ms"
        >
            <h3>
                ${escapeHtml(item.title)}
            </h3>

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
            <h3>
                General guidance is available
            </h3>

            <p>
                This manually entered business category does not yet
                have sector-specific requirements. The checklist shows
                the applicable general and county requirements.
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
        data.disclaimer ||
        "Confirm every requirement with the responsible authority.";

    const checklist = Array.isArray(data.checklist)
        ? data.checklist
        : [];

    checklistCount.textContent = checklist.length;

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
        setStatus(
            "Select the county where the business operates."
        );

        countySelect.focus();

        return false;
    }

    if (!businessTypeInput.value.trim()) {
        setStatus(
            "Select or type the business activity."
        );

        businessTypeInput.focus();

        return false;
    }

    return true;
}


async function generateChecklist(event) {
    event.preventDefault();

    clearStatus();

    if (!validateForm()) {
        return;
    }

    setFormLoading(true);

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
                        getBusinessTypeForRequest()
                })
            }
        );

        renderChecklist(data);

        setStatus(
            "Your checklist is ready. Review each item before applying or paying.",
            "success"
        );
    } catch (error) {
        setStatus(
            error.message ||
            "The checklist could not be prepared."
        );

        console.error(
            "Checklist generation error:",
            error
        );
    } finally {
        setFormLoading(false);
    }
}


function resetApplication() {
    checklistForm.reset();

    const nairobiOption =
        Array.from(countySelect.options).find(
            (option) =>
                option.value.toLowerCase() ===
                "nairobi"
        );

    if (nairobiOption) {
        countySelect.value =
            nairobiOption.value;
    }

    businessTypeInput.value = "";

    updateActiveChoice();
    clearStatus();

    result.hidden = true;
    emptyState.hidden = false;
    checklistItems.innerHTML = "";
    checklistCount.textContent = "0";

    resultBusiness.textContent = "—";
    resultLocation.textContent = "—";
    resultType.textContent = "—";
    disclaimerText.textContent = "";

    businessNameInput.focus();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function printChecklist() {
    if (result.hidden) {
        setStatus(
            "Prepare a checklist before printing."
        );

        return;
    }

    window.print();
}


checklistForm.addEventListener(
    "submit",
    generateChecklist
);

businessTypeInput.addEventListener(
    "input",
    updateActiveChoice
);

businessTypeInput.addEventListener(
    "change",
    updateActiveChoice
);

choiceChips.forEach((chip) => {
    chip.addEventListener(
        "click",
        handleChoiceClick
    );
});

printButton.addEventListener(
    "click",
    printChecklist
);

resetButton.addEventListener(
    "click",
    resetApplication
);


loadOptions();