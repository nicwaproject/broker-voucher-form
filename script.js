// ======================================
// Broker Voucher
// script.js
// ======================================

const leaseContainer = document.getElementById("leaseContainer");
const btnAddLease = document.getElementById("btnAddLease");


document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("summaryCoBrokerA")
    .addEventListener("input", calculateDistribution);

    document.getElementById("summaryCoBrokerB")
    .addEventListener("input", calculateDistribution);

    BrokerVoucher.init();
    initializeLease();
    initializeCommission();

    const squareFeet =
    document.getElementById("squareFeet");

        squareFeet.onfocus = ()=>{

            squareFeet.value =
                parseNumber(squareFeet.value) || "";

        };

        squareFeet.onblur = ()=>{

            if(squareFeet.value==="") return;

            squareFeet.value =
                formatNumber(squareFeet.value);

        };
});

function initializeCommission(){

    document
    .getElementById("squareFeet")
    .addEventListener("input", ()=>{

        const method = document.querySelector(
            'input[name="commissionMethod"]:checked'
        ).value;

        if(method==="perSF"){

            syncCommissionSchedule();

        }

    });

    initializeCommissionMethod();

    syncCommissionSchedule();

}

function initializeCommissionMethod(){

    const radios = document.querySelectorAll(
        'input[name="commissionMethod"]'
    );

    radios.forEach(radio=>{

        radio.addEventListener("change",showCommissionPanel);

    });

    showCommissionPanel();

}

function showCommissionPanel(){

    const method = document.querySelector(
        'input[name="commissionMethod"]:checked'
    ).value;

    document
        .querySelectorAll(".commission-panel")
        .forEach(panel=>{

            panel.classList.add("hidden");

        });

    switch(method){

        case "percentage":

            document
                .getElementById("percentagePanel")
                .classList.remove("hidden");

            break;

        case "perSF":

            document
                .getElementById("perSFPanel")
                .classList.remove("hidden");

            break;

        case "flatFee":

            document
                .getElementById("flatFeePanel")
                .classList.remove("hidden");

            break;

    }



    syncCommissionSchedule();

}

function syncCommissionSchedule(){

    const container =
        document.getElementById("commissionContainer");

    container.innerHTML = "";

    const method = document.querySelector(
        'input[name="commissionMethod"]:checked'
    ).value;

    if(method === "percentage"){

        document.querySelectorAll(".lease-card")
            .forEach((lease,index)=>{

                container.appendChild(
                    createPercentageRow(lease,index+1)
                );

            });

    }

    else if(method === "perSF"){

        const years = getLeaseYears();

        for(let i=1;i<=years;i++){

            container.appendChild(
                createPerSFRow(i)
            );

        }

    }

    else if(method === "flatFee"){

        container.appendChild(
            createFlatFeeRow()
        );

    }

    attachCommissionEvents();
    calculateCommission();

}

function getLeaseYears(){

    let totalMonths = 0;

    document
        .querySelectorAll(".leaseMonths")
        .forEach(input=>{

            totalMonths += parseInt(input.value) || 0;

        });

    return Math.max(
        1,
        Math.ceil(totalMonths / 12)
    );

}

function createPercentageRow(lease,index){

    const row=document.createElement("div");

    row.className="commission-row";

    row.innerHTML=`

        <div class="commission-title">

            Lease Period ${index}

        </div>

        <div class="commission-grid">

            <div class="form-group">

                <label>From</label>

                <input
                    type="text"
                    value="${lease.querySelector(".leaseStartDate").value}"
                    readonly>

            </div>

            <div class="form-group">

                <label>To</label>

                <input
                    type="text"
                    value="${lease.querySelector(".leaseEndDate").value}"
                    readonly>

            </div>

            <div class="form-group">

                <label>Period Net Rent</label>

                <input
                    type="text"
                    value="${lease.querySelector(".leaseNetRent").value}"
                    readonly>

            </div>

            <div class="form-group">

                <label>Commissionable Amount</label>

                <input
                    class="commissionable"
                    type="text"
                    value="${lease.querySelector(".leaseNetRent").value}"
                    readonly>

            </div>

            <div class="form-group">

                <label class="commissionRateLabel">
                    Commission Rate (%)
                </label>

                <input
                    class="commissionRate"
                    type="number"
                    placeholder="0">

            </div>

            <div class="form-group">

                <label>Commission Amount</label>

                <input
                    class="commissionAmount"
                    type="text"
                    readonly>

            </div>

        </div>

    `;

    return row;

}

function createPerSFRow(year){

    const row=document.createElement("div");

    row.className="commission-row";

    const sf =
    parseNumber(
        document.getElementById("squareFeet").value
    );

    row.innerHTML=`

        <div class="commission-title">

            Year ${year}

        </div>

        <div class="commission-grid">

            <div class="form-group">

                <label>Square Feet</label>

                <input
                    class="commissionSF"
                    value="${formatNumber(sf)}"
                    readonly>

            </div>

            <div class="form-group">

                <label>Rate / SF</label>

                <input
                    class="commissionRate"
                    type="number">

            </div>

            <div class="form-group">

                <label>Commission Amount</label>

                <input
                    class="commissionAmount"
                    readonly>

            </div>

        </div>

    `;

    return row;

}

function createFlatFeeRow(){

    const row = document.createElement("div");

    row.className = "commission-row";

    row.innerHTML = `

        <div class="commission-grid">

            <div class="form-group">

                <label>Flat Fee</label>

                <input
                    class="commissionRate"
                    type="number">

            </div>

            <div class="form-group">

                <label>Commission Amount</label>

                <input
                    class="commissionAmount"
                    readonly>

            </div>

        </div>

    `;

    return row;

}


function attachCommissionEvents(){

    document
        .querySelectorAll(".commissionRate")
        .forEach(input=>{

            input.oninput = calculateCommission;

        });

}

function calculateCommission(){

    let totalCommission = 0;

    const method = document.querySelector(
        'input[name="commissionMethod"]:checked'
    )?.value;

    if(!method) return;

    document
        .querySelectorAll(".commission-row")
        .forEach(row=>{

            let commission = 0;

            const rate =
                parseFloat(
                    row.querySelector(".commissionRate").value
                ) || 0;

            switch(method){

                // =====================================
                // Percentage
                // =====================================

                case "percentage":{

                    const commissionable =
                        parseCurrency(
                            row.querySelector(".commissionable").value
                        );

                    commission =
                        commissionable * rate / 100;

                    break;
                }

                // =====================================
                // Per Square Foot
                // =====================================

                case "perSF":{

                    const sf =
                    parseNumber(
                        row.querySelector(".commissionSF").value
                    );

                    commission =
                        sf * rate;

                    break;
                }

                // =====================================
                // Flat Fee
                // =====================================

                case "flatFee":{

                    commission = rate;

                    break;
                }

            }

            row.querySelector(".commissionAmount").value =
                formatCurrency(commission);

            totalCommission += commission;

        });

    const total =
        document.getElementById("totalCommission");

    if(total){

        total.value =
            formatCurrency(totalCommission);

    }

}

// ======================================
// CURRENCY FORMAT
// ======================================


function parseCurrency(value){

    return parseFloat(
        value.replace(/[^\d.-]/g,"")
    ) || 0;

}

function formatCurrency(value){

    return value.toLocaleString("en-US",{
        style:"currency",
        currency:"USD",
        minimumFractionDigits:2
    });

}

function formatCurrencyInput(input){

    let value = input.value.replace(/[^\d.]/g,"");

    if(value === ""){

        input.value = "";
        return;

    }

    input.value = formatCurrency(parseFloat(value));

}

function currencyFocus(input){

    input.value = parseCurrency(input.value) || "";

}

function currencyBlur(input){

    if(input.value === "") return;

    input.value = formatCurrency(
        parseFloat(input.value)
    );

}

// ======================================
// NUMBER FORMAT
// ======================================

function formatNumber(value){

    return Number(value).toLocaleString("en-US");

}

function parseNumber(value){

    return parseFloat(
        value.replace(/,/g,"")
    ) || 0;

}


// ======================================
// Broker Voucher
// ======================================

const BrokerVoucher = {

    currentStep: 0,

    pages: [],

    steps: [],

    init() {

        this.pages = document.querySelectorAll(".page");
        this.steps = document.querySelectorAll(".stepper a");

        this.initializeNavigation();
        this.initializeButtons();

        this.showStep(0);

    },

    initializeNavigation() {

        this.steps.forEach((step, index) => {

            step.addEventListener("click", (e) => {

                e.preventDefault();

                this.showStep(index);

            });

        });

    },

    initializeButtons() {

        document.addEventListener("click", (e) => {

            if (e.target.matches(".btn-next")) {

                this.next();

            }

            if (e.target.matches(".btn-prev")) {

                this.previous();

            }

        });

    },

    showStep(index) {

        this.currentStep = index;

        this.pages.forEach(page => {

            page.classList.remove("active-page");

        });

        this.steps.forEach(step => {

            step.classList.remove("active");

        });

        this.pages[index].classList.add("active-page");

        this.steps[index].classList.add("active");

            // Update Summary ketika membuka Step 4

        if(index === 3){

            updateSummary();

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

function initializeLease(){

    attachLeaseEvents();

    btnAddLease.addEventListener("click", addLeaseCard);

}

function addLeaseCard(){

    const cards = document.querySelectorAll(".lease-card");

    const lastCard = cards[cards.length-1];

    const clone = lastCard.cloneNode(true);

    // reset values
    clone.querySelectorAll("input").forEach(input=>{

        input.value = "";

    });

    leaseContainer.appendChild(clone);

    updateLeaseTitles();

    attachLeaseEvents();

    syncCommissionSchedule();

}

function updateLeaseTitles(){

    document.querySelectorAll(".lease-card").forEach((card,index)=>{

        card.querySelector("h2").textContent =
        `Lease Period ${index+1}`;

    });

}

function deleteLease(card){

    const cards = document.querySelectorAll(".lease-card");

    if(cards.length===1) return;

    card.remove();

    updateLeaseTitles();

    syncCommissionSchedule();

}

function attachLeaseEvents(){

    document.querySelectorAll(".lease-card").forEach(card=>{

        // Delete
        const btnDelete = card.querySelector(".btnDeleteLease");

        btnDelete.onclick = ()=>{

            deleteLease(card);

        };

        // Start Date
        card.querySelector(".leaseStartDate")
        .onchange = ()=>calculateLease(card);

        // End Date
        card.querySelector(".leaseEndDate")
        .onchange = ()=>calculateLease(card);

        // Monthly Rent
        const monthly =
        card.querySelector(".leaseMonthlyRent");

        monthly.onfocus = ()=>{

            currencyFocus(monthly);

        };

        monthly.onblur = ()=>{

            currencyBlur(monthly);

            calculateLease(card);

        };

        // Additional Cost
        const additional =
        card.querySelector(".leaseAdditionalCost");

        additional.onfocus = ()=>{

            currencyFocus(additional);

        };

        additional.onblur = ()=>{

            currencyBlur(additional);

            calculateLease(card);

        };

    });

}

function calculateLease(card){

    const start =
        card.querySelector(".leaseStartDate").value;

    const end =
        card.querySelector(".leaseEndDate").value;

    const monthly =
    parseCurrency(
        card.querySelector(".leaseMonthlyRent").value
    );

    const additional =
    parseCurrency(
        card.querySelector(".leaseAdditionalCost").value
    );

    if(start && end){

        const s = new Date(start);
        const e = new Date(end);

        const months =
            (e.getFullYear()-s.getFullYear())*12 +
            (e.getMonth()-s.getMonth()) + 1;

        card.querySelector(".leaseMonths").value =
            months;

        const net = months * monthly;

        const gross = months * (monthly + additional);

        card.querySelector(".leaseNetRent").value =
        formatCurrency(net);

        card.querySelector(".leaseGrossRent").value =
        formatCurrency(gross);

            syncCommissionSchedule();

    }

}

function calculateDistribution(){

    const total =
        parseCurrency(
            document.getElementById("summaryInvoice").value
        );

    const coA =
        parseCurrency(
            document.getElementById("summaryCoBrokerA").value
        );

    const coB =
        parseCurrency(
            document.getElementById("summaryCoBrokerB").value
        );

    const base =
        total - coA - coB;

    document.getElementById("summaryBaseDistribution").value =
        formatCurrency(base);

    // sementara seluruh base untuk Broker 1

    document.getElementById("summaryBroker1").value =
        formatCurrency(base);

    document.getElementById("summaryBroker2").value =
        formatCurrency(0);

}

function updateSummary(){

    // ======================================
    // Deal
    // ======================================

    document.getElementById("summaryBuilding").value =
        document.getElementById("building").value;

    document.getElementById("summaryAddress").value =
        document.getElementById("buildingAddress").value;

    document.getElementById("summaryTenant").value =
        document.getElementById("tenantName").value;

    document.getElementById("summaryLandlord").value =
        document.getElementById("landlordName").value;

    document.getElementById("summarySF").value =
        formatNumber(
            parseNumber(
                document.getElementById("squareFeet").value
            )
        );

    document.getElementById("summaryDuration").value =
        getLeaseYears() + " Year(s)";

    // ======================================
    // Lease
    // ======================================

    let totalNet = 0;
    let totalGross = 0;

    document.querySelectorAll(".leaseNetRent")
        .forEach(input=>{

            totalNet += parseCurrency(input.value);

        });

    document.querySelectorAll(".leaseGrossRent")
        .forEach(input=>{

            totalGross += parseCurrency(input.value);

        });

    document.getElementById("summaryNetRent").value =
        formatCurrency(totalNet);

    document.getElementById("summaryGrossRent").value =
        formatCurrency(totalGross);

    // ======================================
    // Commission
    // ======================================

    const totalCommission =
        parseCurrency(
            document.getElementById("totalCommission").value
        );

    const method =
        document.querySelector(
            'input[name="commissionMethod"]:checked'
        ).nextElementSibling.innerText;

    document.getElementById("summaryMethod").value =
        method;

    document.getElementById("summaryInvoice").value =
        formatCurrency(totalCommission);

    document.getElementById("summaryInvoiceFee").value =
        formatCurrency(totalCommission);

    document.getElementById("summaryClientFee").value =
        formatCurrency(totalCommission);

    // ======================================
    // Dynamic Labels
    // ======================================

    document.getElementById("coBrokerALabel").textContent =
        document.getElementById("coBrokerAName").value || "Co-Broker A";

    document.getElementById("coBrokerBLabel").textContent =
        document.getElementById("coBrokerBName").value || "Co-Broker B";

    document.getElementById("broker1Label").textContent =
        document.getElementById("broker1").value || "Broker 1";

    document.getElementById("broker2Label").textContent =
        document.getElementById("broker2").value || "Broker 2";

    // ======================================
    // Distribution
    // ======================================

    calculateDistribution();

}



