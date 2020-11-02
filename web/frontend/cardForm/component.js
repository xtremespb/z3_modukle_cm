const calc = require("../../../api/calc");

module.exports = class {
    onCreate(input, out) {
        const state = {
            title: null,
            legacy: out.global.legacy,
            calcLegacy: null
        };
        this.state = state;
        this.holdingData = out.global.userHoldingData;
        this.i18n = out.global.i18n;
    }

    onMount() {
        this.generateModal = this.getComponent("z3_cm_generateModal");
        this.certModal = this.getComponent("z3_cm_certModal");
        this.cardForm = this.getComponent("z3_cm_cardForm");
    }

    onFormSubmit(dataForm) {
        const errors = [];
        let fatal = false;
        const data = dataForm.__default;
        const priceMin = this.holdingData.cards[data.cardType - 1].priceMin || 0;
        const priceMax = this.holdingData.cards[data.cardType - 1].priceMax || 0;
        const dateTimestamp = new Date(`${data.date[6]}${data.date[7]}${data.date[8]}${data.date[9]}`, parseInt(`${data.date[3]}${data.date[4]}`, 10) - 1, `${data.date[0]}${data.date[1]}`).getTime() / 1000;
        const currentTimestamp = parseInt(new Date().getTime() / 1000, 10);
        const allowedOffset = 5259492; // 2 months in seconds
        if (data.price && data.price !== 0) {
            if (priceMin && data.price < priceMin) {
                errors.push(this.i18n.t("priceMinConstraints"));
            }
            if (priceMax && data.price > priceMax) {
                errors.push(this.i18n.t("priceMaxConstraints"));
            }
        }
        if ((currentTimestamp > dateTimestamp && currentTimestamp - dateTimestamp > allowedOffset) || (currentTimestamp < dateTimestamp && dateTimestamp - currentTimestamp > allowedOffset)) {
            errors.push(this.i18n.t("timeConstraints"));
            fatal = true;
        }
        if (errors.length) {
            this.generateModal.func.setActive(true, errors, fatal);
            return;
        }
        this.cardForm.func.submitForm(true);
    }

    onConfirmClick() {
        this.cardForm.func.submitForm(true);
    }

    onButtonClick(data) {
        switch (data.id) {
        case "btnReset":
            this.cardForm.func.resetData();
            this.state.calcLegacy = null;
            this.state.title = null;
            setTimeout(() => this.cardForm.func.autoFocus(), 1);
            break;
        case "btnPrintOffer":
            const win = window.open("/files/offer.pdf", "_blank");
            win.focus();
            win.print();
            break;
        }
    }

    onFormPostSuccess(result) {
        this.certModal.func.setActive(true, result.data.uid, result.data.uidAnnex);
    }

    onFormValueChange(obj) {
        switch (obj.id) {
        case "cardType":
            this.cardForm.func.setFieldVisible("price", obj.label !== "LEGACY");
            this.cardForm.func.setFieldVisible("cardNumber", obj.label !== "LEGACY");
            this.cardForm.func.setFieldMandatory("creditMonths", obj.label === "LEGACY");
            this.cardForm.func.setFieldMandatory("cardNumber", obj.label !== "LEGACY");
            this.cardForm.func.setFieldMandatory("price", obj.label !== "LEGACY");
            this.cardForm.func.setFieldMandatory("years", obj.label.match(/FOX/));
            this.cardForm.func.setFieldVisible("years", obj.label.match(/FOX/));
            this.cardForm.func.setFieldVisible("creditSum", obj.label === "LEGACY");
            this.cardForm.func.setFieldVisible("creditMonths", obj.label === "LEGACY");
            this.cardForm.func.setFieldVisible("creditPercentage", obj.label === "LEGACY");
            this.currentCardLabel = obj.label;
            break;
        case "room":
            this.setState("title", parseInt(obj.value, 10) ? obj.label : null);
            break;
        }
        if (this.currentCardLabel === "LEGACY" && this.cardForm.func.getValue("creditSum") && this.cardForm.func.getValue("creditMonths") && this.cardForm.func.getValue("creditPercentage")) {
            const creditSum = this.cardForm.func.getValue("creditSum");
            const creditMonths = this.cardForm.func.getValue("creditMonths");
            const creditPercentage = this.cardForm.func.getValue("creditPercentage");
            const data = calc.legacy(this.state.legacy.ranges, this.state.legacy.components, creditSum, creditMonths, creditPercentage);
            this.state.calcLegacy = data;
        } else {
            this.state.calcLegacy = null;
        }
    }

    onFormSettled() {
        this.cardForm.func.setFieldMandatory("creditMonths", false);
        this.cardForm.func.setFieldMandatory("cardNumber", true);
        this.cardForm.func.setFieldMandatory("price", true);
        this.cardForm.func.setFieldVisible("years", false);
        this.cardForm.func.setFieldVisible("creditSum", false);
        this.cardForm.func.setFieldVisible("creditMonths", false);
        this.cardForm.func.setFieldVisible("creditPercentage", false);
    }
};
