// ======================================
// Broker Voucher
// script.js
// ======================================

"use strict";

// ======================================
// Data
// ======================================

const STORAGE_KEY = "brokerVoucher";

const DEAL_FIELDS = [
    "dealType",
    "transactionType",
    "extension",
    "leaseExecutionDate",
    "commencementDate",
    "leaseExpiryDate",
    "building",
    "buildingAddress",
    "squareFeet",
    "buildingType",
    "landlordName",
    "landlordAddress",
    "landlordContact",
    "landlordRepresentedBy",
    "tenantName",
    "tenantAddress",
    "tenantRepresentedBy",
    "broker1",
    "broker2",
    "brokerRepresenting",
    "coBrokerACompany",
    "coBrokerAName",
    "coBrokerAAddress",
    "coBrokerARepresenting",
    "coBrokerBCompany",
    "coBrokerBName",
    "coBrokerBAddress",
    "coBrokerBRepresenting",
    "purchaseAgreementExecutionDate",
    "closingDate"
];

const COMMISSION_METHOD_LABELS = {
    percentage: "Percentage",
    perSF: "Per Square Foot",
    flatFee: "Flat Fee"
};

let formData = createDefaultFormData();

let elements = {};

const BrokerVoucher = {
    currentStep: 0,
    pages: [],
    steps: [],

    init() {
        this.pages = document.querySelectorAll(".page");
        this.steps = document.querySelectorAll(".stepper a");

        this.initializeNavigation();
        this.initializeButtons();
        this.showStep(this.currentStep);
    },

    initializeNavigation() {
        this.steps.forEach((step, index) => {
            step.addEventListener("click", (event) => {
                event.preventDefault();
                this.showStep(index);
            });
        });
    },

    initializeButtons() {
        document.addEventListener("click", (event) => {
            if (event.target.matches(".btn-next")) {
                this.next();
            }

            if (event.target.matches(".btn-prev")) {
                this.previous();
            }
        });
    },

    showStep(index) {
        if (!this.pages[index] || !this.steps[index]) return;

        this.currentStep = index;
        renderStepper();

        if (index === 3) {
            calculateSummary();
            renderSummary();
        }
    },

    next() {
        if (this.currentStep >= this.pages.length - 1) return;
        this.showStep(this.currentStep + 1);
    },

    previous() {
        if (this.currentStep <= 0) return;
        this.showStep(this.currentStep - 1);
    }
};

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
    cacheElements();
    loadForm();
    normalizeFormData();
    bindEvents();
    calculateAll();
    renderAll();
    BrokerVoucher.init();
}

function createDefaultSaleData() {
    return {
        closingDate: "",
        purchasePrice: 0
    };
}

function createDefaultFormData() {
    return {
        deal: createDefaultDealData(),

        sale: createDefaultSaleData(),

        lease: [createLeaseData()],
        commission: createDefaultCommissionData(),
        summary: createDefaultSummaryData()
    };
}

function createDefaultDealData() {
    return DEAL_FIELDS.reduce((deal, field) => {
        deal[field] = "";
        return deal;
    }, {});
}

function createLeaseData() {
    return {
        startDate: "",
        endDate: "",
        months: 0,
        monthlyRent: 0,
        escalation: 0,
        additionalCost: 0,
        netRent: 0,
        grossRent: 0
    };
}

function createDefaultCommissionData() {
    return {
        method: "percentage",
        percentageRows: [],
        perSFRows: [],
        flatFee: {
            fee: 0,
            amount: 0
        },
        total: 0
    };
}

function createDefaultSummaryData() {
    return {
        coBrokerA: 0,
        coBrokerB: 0,
        baseDistribution: 0,
        broker1Percent: 0,
        broker2Percent: 0,
        broker1: 0,
        broker2: 0,
        invoice: 0,
        invoiceFee: 0,
        clientFee: 0,
        method: "Percentage"
    };
}

function normalizeFormData() {
    const defaults = createDefaultFormData();
    const savedDeal = formData.deal || {};

    formData = {
        deal: {
            ...defaults.deal,
            ...savedDeal,
            squareFeet: parseNumber(savedDeal.squareFeet)
        },
        lease: Array.isArray(formData.lease) && formData.lease.length
            ? formData.lease.map(normalizeLease)
            : defaults.lease,
        commission: normalizeCommission(formData.commission),
        summary: normalizeSummary(formData.summary),
        sale: {
        ...defaults.sale,
        ...(formData.sale || {}),
        purchasePrice: parseCurrency(formData.sale?.purchasePrice)
},
    };

    syncCommissionRows();
}

function normalizeLease(lease) {
    return {
        ...createLeaseData(),
        startDate: lease.startDate || lease.start || "",
        endDate: lease.endDate || lease.end || "",
        months: parseNumber(lease.months),
        monthlyRent: parseCurrency(lease.monthlyRent),
        escalation: parseNumber(lease.escalation),
        additionalCost: parseCurrency(lease.additionalCost),
        netRent: parseCurrency(lease.netRent),
        grossRent: parseCurrency(lease.grossRent)
    };
}

function normalizeCommission(commission = {}) {
    const defaults = createDefaultCommissionData();
    const method = Object.prototype.hasOwnProperty.call(
        COMMISSION_METHOD_LABELS,
        commission.method
    )
        ? commission.method
        : defaults.method;

    return {
        method,
        percentageRows: Array.isArray(commission.percentageRows)
            ? commission.percentageRows.map(row => ({
                rate: parseNumber(row.rate),
                amount: parseCurrency(row.amount),
                coBrokerRate: parseNumber(row.coBrokerRate),
                coBrokerAmount: parseCurrency(row.coBrokerAmount)
            }))
            : normalizeLegacyCommissionRows(commission.rows),
        perSFRows: Array.isArray(commission.perSFRows)
            ? commission.perSFRows.map(row => ({
                year: parseNumber(row.year),
                rate: parseNumber(row.rate),
                amount: parseCurrency(row.amount)
            }))
            : defaults.perSFRows,
        flatFee: {
            ...defaults.flatFee,
            fee: parseCurrency(commission.flatFee?.fee),
            amount: parseCurrency(commission.flatFee?.amount)
        },
        total: parseCurrency(commission.total)
    };
}

function normalizeSummary(summary = {}) {
    const defaults = createDefaultSummaryData();

    return {
        ...defaults,
        ...summary,
        coBrokerA: parseCurrency(summary.coBrokerA),
        coBrokerB: parseCurrency(summary.coBrokerB),
        baseDistribution: parseCurrency(summary.baseDistribution),
        broker1Percent: parseNumber(summary.broker1Percent),
        broker2Percent: parseNumber(summary.broker2Percent),
        broker1: parseCurrency(summary.broker1),
        broker2: parseCurrency(summary.broker2),
        invoice: parseCurrency(summary.invoice),
        invoiceFee: parseCurrency(summary.invoiceFee),
        clientFee: parseCurrency(summary.clientFee)
    };
}

function normalizeLegacyCommissionRows(rows) {
    if (!Array.isArray(rows)) return [];

    return rows.map(row => ({
        rate: parseNumber(row.rate),
        amount: parseCurrency(row.amount)
    }));
}

// ======================================
// Element Cache
// ======================================

function cacheElements() {
    elements = {
        leaseContainer: getElement("leaseContainer"),
        btnAddLease: getElement("btnAddLease"),
        commissionContainer: getElement("commissionContainer"),
        totalCommission: getElement("totalCommission"),
        percentagePanel: getElement("percentagePanel"),
        perSFPanel: getElement("perSFPanel"),
        flatFeePanel: getElement("flatFeePanel"),
        commissionMethods: document.querySelectorAll('input[name="commissionMethod"]'),
        pages: document.querySelectorAll(".page"),
        steps: document.querySelectorAll(".stepper a")
    };

    DEAL_FIELDS.forEach(field => {
        elements[field] = getElement(field);
    });
}

function getElement(id) {
    return document.getElementById(id);
}

// ======================================
// Events
// ======================================

function bindSaleEvents() {

    const purchasePrice = document.getElementById("purchasePrice");

    if (purchasePrice) {

        purchasePrice.addEventListener("focus", () => {

            purchasePrice.value =
                formData.sale.purchasePrice || "";

        });

        purchasePrice.addEventListener("input", () => {

            formData.sale.purchasePrice =
                parseCurrency(purchasePrice.value);

            saveForm();

        });

        purchasePrice.addEventListener("blur", () => {

            formData.sale.purchasePrice =
                parseCurrency(purchasePrice.value);

            renderSale();

            saveForm();

        });

    }

}

function bindEvents() {
    bindDealEvents();
    bindSaleEvents();
    bindLeaseEvents();
    bindCommissionEvents();
    bindSummaryEvents();
    bindDatePickerEvents();
}

function bindDealEvents() {
    DEAL_FIELDS.forEach(field => {
        const input = elements[field];
        if (!input) return;

        input.addEventListener("input", () => {
            updateDealField(field, input.value);
        });

        input.addEventListener("change", () => {
            updateDealField(field, input.value);
        });
    });

    if (elements.squareFeet) {
        elements.squareFeet.addEventListener("focus", () => {
            elements.squareFeet.value = formData.deal.squareFeet || "";
        });

        elements.squareFeet.addEventListener("blur", () => {
            formData.deal.squareFeet = parseNumber(elements.squareFeet.value);
            renderDeal();
            syncCommissionRows();
            calculateAll();
            renderCommission();
            renderSummary();
            saveForm();
        });
    }
}

function bindLeaseEvents() {
    if (elements.btnAddLease) {
        elements.btnAddLease.addEventListener("click", () => {
            addLease();
        });
    }

    if (!elements.leaseContainer) return;

    elements.leaseContainer.addEventListener("input", (event) => {
        const input = event.target;
        const index = getLeaseIndex(input);
        const field = getLeaseField(input);

        if (index === null || !field) return;

        updateLeaseField(index, field, input.value);

        calculateAll();

        renderCommission();

        renderSummary();

        saveForm();
    });

    elements.leaseContainer.addEventListener("change", (event) => {
        const input = event.target;
        const index = getLeaseIndex(input);
        const field = getLeaseField(input);

        if (index === null || !field) return;

        updateLeaseField(index, field, input.value);
        calculateLease(index);
        syncCommissionRows();
        calculateAll();
        renderLease();
        renderCommission();
        renderSummary();
        saveForm();
    });

    elements.leaseContainer.addEventListener("focusin", (event) => {
        const input = event.target;

        if (input.matches(".leaseMonthlyRent, .leaseAdditionalCost")) {
            input.value = parseCurrency(input.value) || "";
        }
    });

    elements.leaseContainer.addEventListener("focusout", (event) => {
        const input = event.target;
        const index = getLeaseIndex(input);
        const field = getLeaseField(input);

        if (index === null || !field) return;

        updateLeaseField(index, field, input.value);
        calculateLease(index);
        syncCommissionRows();
        calculateAll();
        renderLease();
        renderCommission();
        renderSummary();
        saveForm();
    });

    elements.leaseContainer.addEventListener("click", (event) => {
        const button = event.target.closest(".btnDeleteLease");
        if (!button) return;

        const index = Number(button.dataset.index);
        deleteLease(index);
    });
}

function bindCommissionEvents() {
    elements.commissionMethods.forEach(radio => {
        radio.addEventListener("change", () => {
            if (!radio.checked) return;

            formData.commission.method = radio.value;
            syncCommissionRows();
            calculateAll();
            renderCommission();
            renderSummary();
            saveForm();
        });
    });

    if (!elements.commissionContainer) return;

    elements.commissionContainer.addEventListener("input", (event) => {
        const input = event.target;
        if (

        !input.matches(".commissionRate") &&

        !input.matches(".coBrokerCommissionRate")

    ) {

        return;

    }

        updateCommissionRate(input);
        calculateAll();
        renderCommissionOutputs();
        renderSummary();
        saveForm();
    });
}

function bindSummaryEvents() {
    const broker1Percent =
        getElement("summaryBroker1Percent");

    const broker2Percent =
        getElement("summaryBroker2Percent");

    bindSummaryPercentInput(
        broker1Percent,
        "broker1Percent"
    );

    bindSummaryPercentInput(
        broker2Percent,
        "broker2Percent"
    );
}

function bindDatePickerEvents() {

    // ======================================
    // Calendar Button
    // ======================================

    document.addEventListener("click", (event) => {

        const button =
            event.target.closest(".date-picker-button");

        if (!button) return;

        const wrapper =
            button.closest(".date-input-wrapper");

        if (!wrapper) return;

        const picker =
            wrapper.querySelector(".native-date-picker");

        const textInput =
            wrapper.querySelector(".date-input");

        if (!picker || !textInput) return;


        // If user already entered a date,
        // use it as the calendar's current date.
        const isoDate =
            parseDisplayDate(textInput.value);

        if (isoDate) {
            picker.value = isoDate;
        }


        // Open native calendar
        if (typeof picker.showPicker === "function") {
            try {
                picker.showPicker();
            } catch (error) {
                picker.click();
            }
        } else {
            picker.click();
        }

    });


    // ======================================
    // Native Calendar Changed
    // ======================================

    document.addEventListener("change", (event) => {

        const picker =
            event.target.closest(".native-date-picker");

        if (!picker) return;

        const wrapper =
            picker.closest(".date-input-wrapper");

        if (!wrapper) return;

        const textInput =
            wrapper.querySelector(".date-input");

        if (!textInput) return;

        const isoDate = picker.value;

        if (!isoDate) return;


        // Show MM/DD/YYYY
        textInput.value =
            formatDateDisplay(isoDate);


        // Update correct data field
        updateDateInputData(
            textInput,
            isoDate
        );

    });


    // ======================================
    // Manual Typing
    // ======================================

    document.addEventListener("input", (event) => {

        const input = event.target;

        if (!input.matches(".date-input")) return;


        // Automatically format:
        // 02011998 → 02/01/1998
        const formatted =
            formatTypedDate(input.value);

        if (formatted !== input.value) {
            input.value = formatted;
        }


        const isoDate =
            parseDisplayDate(input.value);

        if (!isoDate) return;


        // Sync hidden native picker
        const wrapper =
            input.closest(".date-input-wrapper");

        if (wrapper) {

            const picker =
                wrapper.querySelector(
                    ".native-date-picker"
                );

            if (picker) {
                picker.value = isoDate;
            }

        }


        // Update actual form data
        updateDateInputData(
            input,
            isoDate
        );

    });


    // ======================================
    // Blur / Validation
    // ======================================

    document.addEventListener("blur", (event) => {

        const input = event.target;

        if (!input.matches(".date-input")) return;


        const value =
            input.value.trim();

        if (!value) {
            input.setCustomValidity("");
            return;
        }


        const isoDate =
            parseDisplayDate(value);

        if (!isoDate) {

            input.setCustomValidity(
                "Please enter the date as MM/DD/YYYY."
            );

            input.reportValidity();

            return;
        }


        input.setCustomValidity("");

        input.value =
            formatDateDisplay(isoDate);

    }, true);

}

function updateDateInputData(input, isoDate) {

    if (!isoDate) return;


    // ======================================
    // Deal Key Dates
    // ======================================

    if (input.id &&
        Object.prototype.hasOwnProperty.call(
            formData.deal,
            input.id
        )
    ) {

        formData.deal[input.id] =
            isoDate;

        syncCommissionRows();
        calculateAll();

        renderTransactionType();
        renderKeyDates();
        renderSale();
        renderCommission();
        renderSummary();

        saveForm();

        return;
    }


    // ======================================
    // Lease Dates
    // ======================================

    if (
        input.matches(".leaseStartDate") ||
        input.matches(".leaseEndDate")
    ) {

        const index =
            getLeaseIndex(input);

        if (index === null) return;


        const field =
            input.matches(".leaseStartDate")
                ? "startDate"
                : "endDate";


        formData.lease[index][field] =
            isoDate;


        // Recalculate lease months
        calculateLease(index);

        // Recalculate all dependent data
        syncCommissionRows();
        calculateAll();

        renderLease();
        renderCommission();
        renderSummary();

        saveForm();

    }

}

function bindSummaryPercentInput(input, field) {
    if (!input) return;

    input.addEventListener("input", () => {
        formData.summary[field] =
            parseNumber(input.value);

        calculateSummary();
        renderSummaryOutputs();
        saveForm();
    });
}

function bindSummaryCurrencyInput(input, field) {
    if (!input) return;

    input.addEventListener("focus", () => {
        input.value = formData.summary[field] || "";
    });

    input.addEventListener("input", () => {
        formData.summary[field] = parseCurrency(input.value);
        calculateSummary();
        renderSummaryOutputs();
        saveForm();
    });

    input.addEventListener("blur", () => {
        formData.summary[field] = parseCurrency(input.value);
        calculateSummary();
        renderSummary();
        saveForm();
    });
}

// ======================================
// Deal
// ======================================

function updateDealField(field, value) {
    if (!Object.prototype.hasOwnProperty.call(formData.deal, field)) return;

    formData.deal[field] = field === "squareFeet"
        ? parseNumber(value)
        : value;

    syncCommissionRows();
    calculateAll();
    renderTransactionType();
    renderKeyDates();
    renderSale();
    renderCommission();
    renderSummary();
    saveForm();
}

function renderDeal() {
    DEAL_FIELDS.forEach(field => {
        const input = elements[field];
        if (!input) return;

        if (field === "squareFeet") {
            input.value = formData.deal.squareFeet
                ? formatNumber(formData.deal.squareFeet)
                : "";
            return;
        }

        if (
            field === "leaseExecutionDate" ||
            field === "commencementDate" ||
            field === "leaseExpiryDate" ||
            field === "purchaseAgreementExecutionDate" ||
            field === "closingDate"
        ) {
            input.value =
                formatDateDisplay(formData.deal[field]);
            return;
        }

        input.value = formData.deal[field] || "";
    });
}

// ======================================
// Lease
// ======================================

function addLease() {
    formData.lease.push(createLeaseData());
    syncCommissionRows();
    calculateAll();
    renderLease();
    renderCommission();
    renderSummary();
    saveForm();
}

function deleteLease(index) {
    if (formData.lease.length <= 1 || !formData.lease[index]) return;

    formData.lease.splice(index, 1);
    formData.commission.percentageRows.splice(index, 1);
    syncCommissionRows();
    calculateAll();
    renderLease();
    renderCommission();
    renderSummary();
    saveForm();
}

function updateLeaseField(index, field, value) {
    const lease = formData.lease[index];
    if (!lease) return;

    if (field === "startDate" || field === "endDate") {
        lease[field] = value;
        return;
    }

    lease[field] = parseCurrency(value);
}

function calculateLease(index) {
    const lease = formData.lease[index];
    if (!lease) return;

    lease.months = calculateLeaseMonths(lease.startDate, lease.endDate);
    lease.netRent = lease.months * lease.monthlyRent;
    lease.grossRent = lease.months * (lease.monthlyRent + lease.additionalCost);
}

function calculateAllLeases() {
    formData.lease.forEach((lease, index) => {

        // Period 1 keeps its manually entered Monthly Rent.
        // Every following period is calculated from the previous period.
        if (index > 0) {
            const previousLease = formData.lease[index - 1];

            lease.monthlyRent =
                previousLease.monthlyRent *
                (1 + toNumber(previousLease.escalation) / 100);
        }

        calculateLease(index);
    });
}

function calculateLeaseMonths(startDate, endDate) {
    if (!startDate || !endDate) return 0;

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return 0;
    }

    return ((end.getFullYear() - start.getFullYear()) * 12) +
        (end.getMonth() - start.getMonth()) + 1;
}

function getLeaseYears() {
    const totalMonths = formData.lease.reduce((total, lease) => {
        return total + toNumber(lease.months);
    }, 0);

    return Math.max(1, Math.ceil(totalMonths / 12));
}

function renderLease() {
    if (!elements.leaseContainer) return;

    elements.leaseContainer.innerHTML = formData.lease
        .map((lease, index) => createLeaseCardHTML(lease, index))
        .join("");
}

function createLeaseCardHTML(lease, index) {
    return `
        <div class="card lease-card" data-index="${index}">
            <div class="card-header">
                <h2>Lease Period ${index + 1}</h2>
                <button
                    type="button"
                    class="btn-danger btnDeleteLease"
                    data-index="${index}">
                    Delete
                </button>
            </div>

            <div class="form-grid">
                <div class="form-group">
                    <label>Start Date</label>
                    <input
                        type="date"
                        class="leaseStartDate"
                        value="${escapeHTML(lease.startDate)}">
                </div>

                <div class="form-group">
                    <label>End Date</label>
                    <input
                        type="date"
                        class="leaseEndDate"
                        value="${escapeHTML(lease.endDate)}">
                </div>

                <div class="form-group">
                    <label>Months</label>
                    <input
                        type="number"
                        class="leaseMonths"
                        value="${lease.months || ""}"
                        readonly>
                </div>

                <div class="form-group">
                    <label>Monthly Rent</label>
                    <input
                    type="text"
                    class="leaseMonthlyRent"
                    placeholder="0.00"
                    inputmode="decimal"
                    value="${lease.monthlyRent ? formatCurrency(lease.monthlyRent) : ""}"
                    ${index > 0 ? "readonly" : ""}>
                </div>

                <div class="form-group">
                    <label>Escalation (%)</label>
                    <input
                        type="number"
                        class="leaseEscalation"
                        placeholder="0"
                        value="${lease.escalation || ""}">
                </div>

                <div class="form-group">
                    <label>Additional Cost</label>
                    <input
                        type="text"
                        class="leaseAdditionalCost"
                        placeholder="0.00"
                        inputmode="decimal"
                        value="${lease.additionalCost ? formatCurrency(lease.additionalCost) : ""}">
                </div>
            </div>

            <div class="summary-grid-2">
                <div class="summary-item">
                    <label>Period Net Rent</label>
                    <input
                        type="text"
                        class="leaseNetRent"
                        value="${formatCurrency(lease.netRent)}"
                        readonly>
                </div>

                <div class="summary-item">
                    <label>Period Gross Rent</label>
                    <input
                        type="text"
                        class="leaseGrossRent"
                        value="${formatCurrency(lease.grossRent)}"
                        readonly>
                </div>
            </div>
        </div>
    `;
}

function getLeaseIndex(input) {
    const card = input.closest(".lease-card");
    if (!card) return null;

    const index = Number(card.dataset.index);
    return Number.isInteger(index) ? index : null;
}

function getLeaseField(input) {
    if (input.matches(".leaseStartDate")) return "startDate";
    if (input.matches(".leaseEndDate")) return "endDate";
    if (input.matches(".leaseMonthlyRent")) return "monthlyRent";
    if (input.matches(".leaseEscalation")) return "escalation";
    if (input.matches(".leaseAdditionalCost")) return "additionalCost";
    return "";
}


// ======================================
// Commission
// ======================================

function isSaleTransaction() {
    return formData.deal.dealType === "sale";
}

function syncCommissionRows() {
    syncPercentageRows();
    syncPerSFRows();
}

function syncPercentageRows() {
    const rowCount = isSaleTransaction()
        ? 1
        : formData.lease.length;

    while (formData.commission.percentageRows.length < rowCount) {
        formData.commission.percentageRows.push({
            rate: 0,
            amount: 0,
            coBrokerRate: 0,
            coBrokerAmount: 0
        });
    }

    formData.commission.percentageRows.length = rowCount;
}

function syncPerSFRows() {
    const years = getLeaseYears();

    while (formData.commission.perSFRows.length < years) {
        formData.commission.perSFRows.push({
            year: formData.commission.perSFRows.length + 1,
            rate: 0,
            amount: 0
        });
    }

    formData.commission.perSFRows.length = years;

    formData.commission.perSFRows.forEach((row, index) => {
        row.year = index + 1;
    });
}

function updateCommissionRate(input) {
    const method = formData.commission.method;
    const index = Number(input.dataset.index);
    const value = parseCurrency(input.value);

    if (method === "percentage" && formData.commission.percentageRows[index]) {

    const row = formData.commission.percentageRows[index];

    if (input.matches(".coBrokerCommissionRate")) {
        row.coBrokerRate = value;
    } else {
        row.rate = value;
    }
    }

    if (method === "perSF" && formData.commission.perSFRows[index]) {
        formData.commission.perSFRows[index].rate = value;
    }

    if (method === "flatFee") {
        formData.commission.flatFee.fee = value;
    }
}

function calculateCommission() {
    let total = 0;

    if (formData.commission.method === "percentage") {
        formData.commission.percentageRows.forEach((row, index) => {
            let commissionableAmount = 0;

            if (isSaleTransaction()) {
                // Sale uses Purchase Price as the commissionable amount.
                commissionableAmount =
                    toNumber(formData.sale.purchasePrice);
            } else {
                // Lease uses the Net Rent for each lease period.
                const lease =
                    formData.lease[index] || createLeaseData();

                commissionableAmount =
                    toNumber(lease.netRent);
            }

            row.amount =
                commissionableAmount *
                toNumber(row.rate) / 100;

            row.coBrokerAmount =
                row.amount *
                toNumber(row.coBrokerRate) / 100;

            total += row.amount;
        });
    }

    if (formData.commission.method === "perSF") {
        const squareFeet =
            toNumber(formData.deal.squareFeet);

        formData.commission.perSFRows.forEach(row => {
            row.amount =
                squareFeet * toNumber(row.rate);

            total += row.amount;
        });
    }

    if (formData.commission.method === "flatFee") {
        formData.commission.flatFee.amount =
            toNumber(formData.commission.flatFee.fee);

        total = formData.commission.flatFee.amount;
    }

    formData.commission.total = total;
}

function renderCommission() {
    renderCommissionMethod();
    renderCommissionPanels();

    if (!elements.commissionContainer) return;

    if (formData.commission.method === "percentage") {  

    if (isSaleTransaction()) {

            elements.commissionContainer.innerHTML =
                createPercentageRowHTML(null, 0);

        } else {

            elements.commissionContainer.innerHTML =
                formData.lease
                    .map((lease, index) =>
                        createPercentageRowHTML(lease, index)
                    )
                    .join("");
        }
    }

    if (formData.commission.method === "perSF") {
        elements.commissionContainer.innerHTML = formData.commission.perSFRows
            .map((row, index) => createPerSFRowHTML(row, index))
            .join("");
    }

    if (formData.commission.method === "flatFee") {
        elements.commissionContainer.innerHTML = createFlatFeeRowHTML();
    }

    renderCommissionOutputs();
}

function renderCommissionMethod() {
    elements.commissionMethods.forEach(radio => {
        radio.checked = radio.value === formData.commission.method;
    });
}

function renderCommissionPanels() {
    const panels = {
        percentage: elements.percentagePanel,
        perSF: elements.perSFPanel,
        flatFee: elements.flatFeePanel
    };

    Object.entries(panels).forEach(([method, panel]) => {
        if (!panel) return;
        panel.classList.toggle("hidden", method !== formData.commission.method);
    });
}

function createPercentageRowHTML(lease, index) {
    const row =
        formData.commission.percentageRows[index] || {
            rate: 0,
            amount: 0,
            coBrokerRate: 0,
            coBrokerAmount: 0
        };

    const sale = isSaleTransaction();

    const title = sale
        ? "Sale"
        : `Lease Period ${index + 1}`;

    const firstLabel = sale
        ? "Purchase Price"
        : "From";

    const firstValue = sale
        ? toNumber(formData.sale.purchasePrice)
        : formatDateDisplay(lease.startDate);

    const secondLabel = sale
        ? "Closing Date"
        : "To";

    const secondValue = sale
        ? formatDateDisplay(formData.deal.closingDate)
        : formatDateDisplay(lease.endDate);

    const commissionableLabel = sale
        ? "Purchase Price"
        : "Period Net Rent";

    const commissionableAmount = sale
        ? toNumber(formData.sale.purchasePrice)
        : toNumber(lease.netRent);

    return `
        <div class="commission-row" data-index="${index}">
            <div class="commission-title">
                ${title}
            </div>

            <div class="commission-grid">

                <div class="form-group">
                    <label>${firstLabel}</label>
                    <input
                        type="text"
                        value="${escapeHTML(
                            sale
                                ? formatCurrency(firstValue)
                                : firstValue
                        )}"
                        readonly>
                </div>

                <div class="form-group">
                    <label>${secondLabel}</label>
                    <input
                        type="text"
                        value="${escapeHTML(secondValue)}"
                        readonly>
                </div>

                ${sale ? "" : `
                    <div class="form-group">
                        <label>${commissionableLabel}</label>
                        <input
                            type="text"
                            value="${formatCurrency(commissionableAmount)}"
                            readonly>
                    </div>
                `}

                <div class="form-group">
                    <label>Commissionable Amount</label>
                    <input
                        class="commissionable"
                        type="text"
                        value="${formatCurrency(commissionableAmount)}"
                        readonly>
                </div>

                <div class="form-group">
                    <label class="commissionRateLabel">
                        Commission Rate (%)
                    </label>
                    <input
                        class="commissionRate"
                        data-index="${index}"
                        type="number"
                        placeholder="0"
                        value="${row.rate || ""}">
                </div>

                <div class="form-group">
                    <label>Commission Amount</label>
                    <input
                        class="commissionAmount"
                        type="text"
                        value="${formatCurrency(row.amount)}"
                        readonly>
                </div>

                <div class="form-group">
                    <label>Co-Broker Commission Rate (%)</label>
                    <div class="percent-input">
                        <input
                            class="coBrokerCommissionRate"
                            data-index="${index}"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                            value="${row.coBrokerRate || ""}">
                    </div>
                </div>

                <div class="form-group">
                    <label>Co-Broker Commission Amount</label>
                    <input
                        class="coBrokerCommissionAmount"
                        type="text"
                        value="${formatCurrency(row.coBrokerAmount)}"
                        readonly>
                </div>

            </div>
        </div>
    `;
}

function createPerSFRowHTML(row, index) {
    return `
        <div class="commission-row" data-index="${index}">
            <div class="commission-title">
                Year ${index + 1}
            </div>

            <div class="commission-grid">
                <div class="form-group">
                    <label>Square Feet</label>
                    <input
                        class="commissionSF"
                        value="${formatNumber(formData.deal.squareFeet)}"
                        readonly>
                </div>

                <div class="form-group">
                    <label>Rate / SF</label>
                    <input
                        class="commissionRate"
                        data-index="${index}"
                        type="number"
                        value="${row.rate || ""}">
                </div>

                <div class="form-group">
                    <label>Commission Amount</label>
                    <input
                        class="commissionAmount"
                        value="${formatCurrency(row.amount)}"
                        readonly>
                </div>
            </div>
        </div>
    `;
}

function createFlatFeeRowHTML() {
    return `
        <div class="commission-row">
            <div class="commission-grid">
                <div class="form-group">
                    <label>Flat Fee</label>
                    <input
                        class="commissionRate"
                        data-index="0"
                        type="number"
                        value="${formData.commission.flatFee.fee || ""}">
                </div>

                <div class="form-group">
                    <label>Commission Amount</label>
                    <input
                        class="commissionAmount"
                        value="${formatCurrency(formData.commission.flatFee.amount)}"
                        readonly>
                </div>
            </div>
        </div>
    `;
}

function renderCommissionOutputs() {
    if (elements.totalCommission) {
        elements.totalCommission.value = formatCurrency(formData.commission.total);
    }

    if (!elements.commissionContainer) return;

    elements.commissionContainer.querySelectorAll(".commission-row").forEach((row, index) => {
        const amountInput = row.querySelector(".commissionAmount");
        if (!amountInput) return;

        const coBrokerAmountInput =
        row.querySelector(".coBrokerCommissionAmount");


        if (formData.commission.method === "percentage") {
        amountInput.value = formatCurrency(
        formData.commission.percentageRows[index]?.amount || 0
            );

            if (coBrokerAmountInput) {
                coBrokerAmountInput.value = formatCurrency(
                    formData.commission.percentageRows[index]?.coBrokerAmount || 0
                );
            }
        }

        if (formData.commission.method === "perSF") {
            amountInput.value = formatCurrency(formData.commission.perSFRows[index]?.amount || 0);
        }

        if (formData.commission.method === "flatFee") {
            amountInput.value = formatCurrency(formData.commission.flatFee.amount);
        }
    });
}

// ======================================
// Summary
// ======================================

function calculateSummary() {
    const totalCommission = toNumber(formData.commission.total);
    const coBrokerA =

        formData.commission.method === "percentage"

            ? formData.commission.percentageRows.reduce(

                (total, row) =>

                    total + toNumber(row.coBrokerAmount),

                0

            )

            : 0;

    const coBrokerB = 0;
    formData.summary.coBrokerA = coBrokerA;
    formData.summary.coBrokerB = coBrokerB;
    const baseDistribution = totalCommission - coBrokerA - coBrokerB;

    formData.summary.invoice = totalCommission;
    formData.summary.invoiceFee = totalCommission;
    formData.summary.clientFee = totalCommission;
    formData.summary.method = COMMISSION_METHOD_LABELS[formData.commission.method] || "";
    formData.summary.baseDistribution = baseDistribution;
    
    // ==============================

    // Broker Distribution

    // ==============================
    const broker1Percent = toNumber(formData.summary.broker1Percent);
    const broker2Percent = toNumber(formData.summary.broker2Percent);

    const totalPercent = broker1Percent + broker2Percent;

    if (Math.abs(totalPercent - 100) < 0.001) {

        formData.summary.broker1 =
            baseDistribution * broker1Percent / 100;

        formData.summary.broker2 =
            baseDistribution * broker2Percent / 100;

    } else {

        formData.summary.broker1 = 0;
        formData.summary.broker2 = 0;

    }

}

function renderSummary() {
    setFieldValue("summaryInvoice", formatCurrency(formData.summary.invoice));
    setFieldValue("summaryInvoiceFee", formatCurrency(formData.summary.invoiceFee));
    setFieldValue("summaryClientFee", formatCurrency(formData.summary.clientFee));
    setFieldValue("summaryMethod", formData.summary.method);
    setFieldValue("summaryCoBrokerA", formData.summary.coBrokerA ? formatCurrency(formData.summary.coBrokerA) : "");
    setFieldValue("summaryCoBrokerB", formData.summary.coBrokerB ? formatCurrency(formData.summary.coBrokerB) : "");

    renderSummaryOutputs();
    renderSummaryLabels();
}

function renderSummaryOutputs() {

    setFieldValue(
        "summaryBaseDistribution",
        formatCurrency(formData.summary.baseDistribution)
    );

    setFieldValue(
        "summaryBroker1",
        formatCurrency(formData.summary.broker1)
    );

    setFieldValue(
        "summaryBroker2",
        formatCurrency(formData.summary.broker2)
    );


    const broker1Percent =
        getElement("summaryBroker1Percent");

    const broker2Percent =
        getElement("summaryBroker2Percent");


    if (broker1Percent) {
        broker1Percent.value =
            formData.summary.broker1Percent || "";
    }

    if (broker2Percent) {
        broker2Percent.value =
            formData.summary.broker2Percent || "";
    }


    // Distribution validation

    const status =
        getElement("distributionPercentStatus");

    const totalPercent =
        toNumber(formData.summary.broker1Percent) +
        toNumber(formData.summary.broker2Percent);


    if (status) {

        if (Math.abs(totalPercent - 100) < 0.001) {

            status.textContent =
                "Distribution total: 100%";

        } else {

            status.textContent =
                `Distribution total: ${totalPercent}% — must equal 100%`;

        }

    }
}

function renderSummaryLabels() {

    const coBrokerALabel = document.getElementById("coBrokerALabel");
    const coBrokerBLabel = document.getElementById("coBrokerBLabel");
    const broker1Label = document.getElementById("broker1Label");
    const broker2Label = document.getElementById("broker2Label");

    if (coBrokerALabel) {
        coBrokerALabel.textContent =
            formData.deal.coBrokerAName || "Co-Broker A";
    }

    if (coBrokerBLabel) {
        coBrokerBLabel.textContent =
            formData.deal.coBrokerBName || "Co-Broker B";
    }
    
    if (broker1Label) {
    broker1Label.textContent =
    formData.deal.broker1 || "Broker 1";
    }

    if (broker2Label) {
    broker2Label.textContent =
    formData.deal.broker2 || "Broker 2";
    }

}



// ======================================
// Render
// ======================================

function renderSale() {
    const closingDate =
        document.getElementById("saleClosingDate");

    const purchasePrice =
        document.getElementById("purchasePrice");

    if (closingDate) {
        closingDate.value =
            formData.deal.closingDate || "";
    }

    if (purchasePrice) {
        purchasePrice.value =
            formData.sale.purchasePrice
                ? formatCurrency(formData.sale.purchasePrice)
                : "";
    }
}

function renderTransactionType() {
    const sale = isSaleTransaction();

        const transactionTitle =

        document.getElementById("transactionTitle");

        const transactionDescription =

            document.getElementById("transactionDescription");

        if (transactionTitle) {

            transactionTitle.textContent =

                sale ? "Sale Details" : "Lease Schedule";

        }

    if (transactionDescription) {

        transactionDescription.textContent =

            sale

                ? "Enter the details for this sale transaction."

                : "Add one or more lease periods for this transaction.";

    }

    const saleDetails =
        document.getElementById("saleDetails");

    const leaseContainer =
        document.getElementById("leaseContainer");

    const addLeaseButton =
        document.getElementById("btnAddLease");

    if (saleDetails) {
        saleDetails.classList.toggle("hidden", !sale);
    }

    if (leaseContainer) {
        leaseContainer.classList.toggle("hidden", sale);
    }

    if (addLeaseButton) {
        addLeaseButton.parentElement.classList.toggle(
            "hidden",
            sale
        );
    }
}

function renderKeyDates() {
    const sale = isSaleTransaction();

    document.querySelectorAll(".lease-key-date").forEach(el => {
        el.classList.toggle("hidden", sale);
    });

    document.querySelectorAll(".sale-key-date").forEach(el => {
        el.classList.toggle("hidden", !sale);
    });
}


function renderAll() {
    renderDeal();
    renderSale();
    renderTransactionType();
    renderKeyDates();
    renderLease();
    renderCommission();
    renderSummary();
    renderStepper();
}

function renderStepper() {
    const pages = BrokerVoucher.pages.length ? BrokerVoucher.pages : elements.pages;
    const steps = BrokerVoucher.steps.length ? BrokerVoucher.steps : elements.steps;

    pages.forEach((page, index) => {
        page.classList.toggle("active-page", index === BrokerVoucher.currentStep);
    });

    steps.forEach((step, index) => {
        step.classList.toggle("active", index === BrokerVoucher.currentStep);
    });
}

// ======================================
// Storage
// ======================================

function saveForm() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
        console.warn("Unable to save broker voucher form.", error);
    }
}

function loadForm() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) return;

        formData = JSON.parse(savedData);
    } catch (error) {
        console.warn("Unable to load broker voucher form.", error);
        formData = createDefaultFormData();
    }
}

// ======================================
// Calculations
// ======================================

function calculateAll() {
    calculateAllLeases();
    syncCommissionRows();
    calculateCommission();
    calculateSummary();
}

// ======================================
// Formatting
// ======================================

function parseCurrency(value) {
    if (value === null || value === undefined) return 0;

    return parseFloat(String(value).replace(/[^\d.-]/g, "")) || 0;
}

function formatCurrency(value) {
    return toNumber(value).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2
    });
}

function formatTypedDate(value) {
    const digits = String(value)
        .replace(/\D/g, "")
        .slice(0, 8);

    if (digits.length <= 2) {
        return digits;
    }

    if (digits.length <= 4) {
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDisplayDate(value) {
    const match = String(value)
        .trim()
        .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (!match) return "";

    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return "";
    }

    return [
        String(year).padStart(4, "0"),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0")
    ].join("-");
}

function getDateTarget(input) {
    return input.dataset.dateTarget || input.id || "";
}

function updateDateField(target, isoDate, input) {
    if (!isoDate) return;

    // Static Deal fields
    if (Object.prototype.hasOwnProperty.call(formData.deal, target)) {
        formData.deal[target] = isoDate;

        syncCommissionRows();
        calculateAll();
        renderTransactionType();
        renderKeyDates();
        renderSale();
        renderCommission();
        renderSummary();
        saveForm();

        return;
    }

    // Dynamic Lease fields
    if (
        input.matches(".leaseStartDate, .leaseEndDate")
    ) {
        const index = getLeaseIndex(input);

        if (index === null) return;

        const field = getLeaseField(input);

        updateLeaseField(index, field, isoDate);

        calculateAll();
        renderCommission();
        renderSummary();
        saveForm();
    }
}

function formatDateDisplay(dateString) {

    if (!dateString) return "";

    const [year, month, day] = dateString.split("-");

    if (!year || !month || !day) return dateString;

    return `${month}/${day}/${year}`;
}

function formatNumber(value) {
    const number = toNumber(value);
    return number ? number.toLocaleString("en-US") : "";
}

function parseNumber(value) {
    if (value === null || value === undefined) return 0;

    return parseFloat(String(value).replace(/,/g, "")) || 0;
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

// ======================================
// UI Helpers
// ======================================


function setFieldValue(id, value) {
    const element = getElement(id);
    if (!element) return;

    element.value = value;
}

function setTextContent(id, value) {
    const element = getElement(id);
    if (!element) return;

    element.textContent = value;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
