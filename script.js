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
    "coBrokerAName",
    "coBrokerAAddress",
    "coBrokerARepresenting",
    "coBrokerBName",
    "coBrokerBAddress",
    "coBrokerBRepresenting"
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

function createDefaultFormData() {
    return {
        deal: createDefaultDealData(),
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
        summary: normalizeSummary(formData.summary)
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
                amount: parseCurrency(row.amount)
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

function bindEvents() {
    bindDealEvents();
    bindLeaseEvents();
    bindCommissionEvents();
    bindSummaryEvents();
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
        if (!input.matches(".commissionRate")) return;

        updateCommissionRate(input);
        calculateAll();
        renderCommissionOutputs();
        renderSummary();
        saveForm();
    });
}

function bindSummaryEvents() {
    const coBrokerA = getElement("summaryCoBrokerA");
    const coBrokerB = getElement("summaryCoBrokerB");

    bindSummaryCurrencyInput(coBrokerA, "coBrokerA");
    bindSummaryCurrencyInput(coBrokerB, "coBrokerB");
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
                        value="${lease.monthlyRent ? formatCurrency(lease.monthlyRent) : ""}">
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

function syncCommissionRows() {
    syncPercentageRows();
    syncPerSFRows();
}

function syncPercentageRows() {
    while (formData.commission.percentageRows.length < formData.lease.length) {
        formData.commission.percentageRows.push({
            rate: 0,
            amount: 0
        });
    }

    formData.commission.percentageRows.length = formData.lease.length;
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
        formData.commission.percentageRows[index].rate = value;
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
            const lease = formData.lease[index] || createLeaseData();
            row.amount = lease.netRent * toNumber(row.rate) / 100;
            total += row.amount;
        });
    }

    if (formData.commission.method === "perSF") {
        const squareFeet = toNumber(formData.deal.squareFeet);

        formData.commission.perSFRows.forEach(row => {
            row.amount = squareFeet * toNumber(row.rate);
            total += row.amount;
        });
    }

    if (formData.commission.method === "flatFee") {
        formData.commission.flatFee.amount = toNumber(formData.commission.flatFee.fee);
        total = formData.commission.flatFee.amount;
    }

    formData.commission.total = total;
}

function renderCommission() {
    renderCommissionMethod();
    renderCommissionPanels();

    if (!elements.commissionContainer) return;

    if (formData.commission.method === "percentage") {
        elements.commissionContainer.innerHTML = formData.lease
            .map((lease, index) => createPercentageRowHTML(lease, index))
            .join("");
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
    const row = formData.commission.percentageRows[index] || { rate: 0, amount: 0 };

    return `
        <div class="commission-row" data-index="${index}">
            <div class="commission-title">
                Lease Period ${index + 1}
            </div>

            <div class="commission-grid">
                <div class="form-group">
                    <label>From</label>
                    <input
                        type="text"
                        value="${escapeHTML(lease.startDate)}"
                        readonly>
                </div>

                <div class="form-group">
                    <label>To</label>
                    <input
                        type="text"
                        value="${escapeHTML(lease.endDate)}"
                        readonly>
                </div>

                <div class="form-group">
                    <label>Period Net Rent</label>
                    <input
                        type="text"
                        value="${formatCurrency(lease.netRent)}"
                        readonly>
                </div>

                <div class="form-group">
                    <label>Commissionable Amount</label>
                    <input
                        class="commissionable"
                        type="text"
                        value="${formatCurrency(lease.netRent)}"
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

        if (formData.commission.method === "percentage") {
            amountInput.value = formatCurrency(formData.commission.percentageRows[index]?.amount || 0);
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
    const coBrokerA = toNumber(formData.summary.coBrokerA);
    const coBrokerB = toNumber(formData.summary.coBrokerB);
    const baseDistribution = totalCommission - coBrokerA - coBrokerB;

    formData.summary.invoice = totalCommission;
    formData.summary.invoiceFee = totalCommission;
    formData.summary.clientFee = totalCommission;
    formData.summary.method = COMMISSION_METHOD_LABELS[formData.commission.method] || "";
    formData.summary.baseDistribution = baseDistribution;
    formData.summary.broker1 = baseDistribution;
    formData.summary.broker2 = baseDistribution;
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
    setFieldValue("summaryBaseDistribution", formatCurrency(formData.summary.baseDistribution));
    setFieldValue("summaryBroker1", formatCurrency(formData.summary.broker1));
    setFieldValue("summaryBroker2", formatCurrency(formData.summary.broker2));
}

function renderSummaryLabels() {
    setTextContent("coBrokerALabel", formData.deal.coBrokerAName || "Co-Broker A");
    setTextContent("coBrokerBLabel", formData.deal.coBrokerBName || "Co-Broker B");
    setTextContent("broker1Label", formData.deal.broker1 || "Broker 1");
    setTextContent("broker2Label", formData.deal.broker2 || "Broker 2");
}

// ======================================
// Render
// ======================================

function renderAll() {
    renderDeal();
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
