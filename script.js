// ======================================
// Broker Voucher
// script.js
// ======================================

const leaseContainer = document.getElementById("leaseContainer");
const btnAddLease = document.getElementById("btnAddLease");


document.addEventListener("DOMContentLoaded", () => {

    BrokerVoucher.init();
    initializeLease();
    initializeCommission();
});

function initializeCommission(){

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

            document
                .querySelectorAll(".commissionRateLabel")
                .forEach(label=>{
                    label.textContent = "Commission Rate (%)";
                });

            document
                .querySelectorAll(".commissionRate")
                .forEach(input=>{

                    switch(method){

                        case "percentage":
                            input.placeholder = "%";
                            break;

                        case "perSF":
                            input.placeholder = "$ / SF";
                            break;

                        case "flatFee":
                            input.placeholder = "$";
                            break;

                    }

                });

            break;

        case "perSF":

            document
                .getElementById("perSFPanel")
                .classList.remove("hidden");

            document
                .querySelectorAll(".commissionRateLabel")
                .forEach(label=>{
                    label.textContent = "Rate per SF";
                });

            break;

        case "flatFee":

            document
                .getElementById("flatFeePanel")
                .classList.remove("hidden");

            document
                .querySelectorAll(".commissionRateLabel")
                .forEach(label=>{
                    label.textContent = "Flat Fee Amount";
                });

            break;

    }

    document
        .querySelectorAll(".commissionRate")
        .forEach(input=>{

            switch(method){

                case "percentage":
                    input.placeholder="%";
                    break;

                case "perSF":
                    input.placeholder="$ / SF";
                    break;

                case "flatFee":
                    input.placeholder="$";
                    break;

            }

        });

    calculateCommission();

}

function syncCommissionSchedule(){

    const leaseCards =
        document.querySelectorAll(".lease-card");

    const container =
        document.getElementById("commissionContainer");

    container.innerHTML="";

    leaseCards.forEach((lease,index)=>{

        container.appendChild(

            createCommissionRow(lease,index+1)

        );

    });

    attachCommissionEvents();
    calculateCommission();

}

function createCommissionRow(lease,index){

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

            const squareFeet =
            parseFloat(
                document.getElementById("squareFeet").value
            ) || 0;

            const commissionable =
            parseCurrency(
                row.querySelector(".commissionable").value
            );

            const rate =
                parseFloat(
                    row.querySelector(".commissionRate")
                    .value
                ) || 0;

            let commission = 0;

            switch(method){

                case "percentage":

                    commission =
                        commissionable * rate / 100;

                    break;

                case "perSF":

                    commission =
                        squareFeet * rate;

                    break;

                case "flatFee":

                    commission = rate;

                    break;

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

