import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs-extra";
import path from "path";
import {
    v4 as uuid
} from "uuid";
import moment from "moment";
import template from "lodash/template";
import generateData from "./data/generate.json";
import Auth from "../../../shared/lib/auth";
import C from "../../../shared/lib/constants";
import Mailer from "../../../shared/lib/mailer";
import Utils from "./utils";

const utils = new Utils();
const mailTemplateLegacy = template(fs.readFileSync(`${__dirname}/../mail/modules/cm/legacy.template`));

export default () => ({
    schema: {
        body: generateData.schema
    },
    attachValidation: true,
    async handler(req, rep) {
        // Check permissions
        const auth = new Auth(this.mongo.db, this, req, rep, C.USE_BEARER_FOR_TOKEN);
        if (!(await auth.getUserData()) || !auth.checkStatus("active")) {
            rep.unauthorizedError(rep);
            return;
        }
        // Validate form
        if (req.validationError) {
            rep.logError(req, req.validationError ? req.validationError.message : "Request Error");
            rep.validationError(rep, req.validationError || {});
            return;
        }
        try {
            const cmData = await this.mongo.db.collection(req.zoiaConfig.collections.registry).findOne({
                _id: "cm_data"
            });
            if (!cmData || !cmData.config || !cmData.config.holdings || !auth.checkGroup("cm")) {
                rep.requestError(rep, {
                    failed: true,
                    error: "Configuration not found",
                    errorKeyword: "noConfig",
                    errorData: []
                });
                return;
            }
            let userHolding;
            Object.keys(cmData.config.holdings).map(h => {
                if (auth.checkGroup(h)) {
                    userHolding = h;
                }
            });
            if (!userHolding || !cmData.config.holdings[userHolding] || req.body.room > cmData.config.holdings[userHolding].rooms.length) {
                rep.requestError(rep, {
                    failed: true,
                    error: "Holding not found",
                    errorKeyword: "noHolding",
                    errorData: []
                });
                return;
            }
            const holdingData = cmData.config.holdings[userHolding];
            const cardId = holdingData.cards[req.body.cardType - 1].id;
            const templatePath = path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryTemplates}/${cardId}.docx`);
            const templateData = await fs.readFile(templatePath, "binary");
            const dataZip = new PizZip(templateData);
            const templateDoc = new Docxtemplater();
            templateDoc.loadZip(dataZip);
            const [dateDD, dateMM, dateYYYY] = req.body.date.split(/\./);
            const dateStringMM = utils.getRuMonthString(dateMM);
            const years = (req.body.years ? parseInt(req.body.years, 10) : 1) || 1;
            const price = cardId.match(/^fox/) ? parseInt(req.body.price * years, 10) : parseInt(req.body.price, 10);
            let componentsTotalCost = 0;
            let componentsOfficeCost = 0;
            const components = [];
            let {
                cardNumber
            } = req.body;
            let rangeIndex = 0;
            // Check legacy fields
            if (cardId === "legacy") {
                if (!req.body.years || req.body.years < 1) {
                    rep.requestError(rep, {
                        failed: true,
                        error: "Invalid years value",
                        errorKeyword: "invalidYears",
                        errorData: [{
                            keyword: "invalidYears",
                            dataPath: ".years"
                        }]
                    });
                    return;
                }
                if (!req.body.creditSum || req.body.creditSum < 1) {
                    rep.requestError(rep, {
                        failed: true,
                        error: "Invalid credit sum",
                        errorKeyword: "invalidCreditSum",
                        errorData: [{
                            keyword: "invalidCreditSum",
                            dataPath: ".creditSum"
                        }]
                    });
                    return;
                }
                if (!req.body.creditPercentage || req.body.creditPercentage < 1) {
                    rep.requestError(rep, {
                        failed: true,
                        error: "Invalid credit percents value",
                        errorKeyword: "invalidCreditPercentage",
                        errorData: [{
                            keyword: "invalidCreditPercentage",
                            dataPath: ".creditPercentage"
                        }]
                    });
                    return;
                }
                componentsTotalCost = parseInt((req.body.creditSum / 100) * req.body.creditPercentage * req.body.years, 10);
                let componentsArray;
                cmData.config.legacy.ranges.map((range, index) => {
                    if (!componentsArray && componentsTotalCost > range.from && (!range.to || componentsTotalCost < range.to)) {
                        componentsArray = range.components;
                        rangeIndex = index;
                    }
                });
                let selectedComponentsCost = 0;
                componentsArray.map(c => {
                    const {
                        cost,
                    } = cmData.config.legacy.components[c - 1];
                    selectedComponentsCost += cost || 0;
                });
                let options = 1;
                if (selectedComponentsCost !== componentsTotalCost) {
                    if (componentsTotalCost - selectedComponentsCost < 200) {
                        componentsOfficeCost = componentsTotalCost - selectedComponentsCost;
                    } else {
                        options = parseInt((componentsTotalCost - selectedComponentsCost) / 200, 10);
                        const costDiff = componentsTotalCost - (selectedComponentsCost + (options * 200));
                        if (costDiff && costDiff < 200) {
                            componentsOfficeCost = parseInt(costDiff, 10);
                        }
                    }
                }
                componentsArray.map(c => {
                    const item = {
                        title: cmData.config.legacy.components[c - 1].title,
                        amount: c === 2 ? options + 1 : cmData.config.legacy.components[c - 1].amount,
                        cost: c === 2 ? cmData.config.legacy.components[c - 1].cost * (options + 1) : cmData.config.legacy.components[c - 1].cost
                    };
                    const formula = cmData.config.legacy.components[c - 1].formula || "";
                    switch (formula) {
                        // case "office":
                        //     componentsOfficeCost = componentsTotalCost - selectedComponentsCost;
                        //     break;
                    case "guard":
                        item.cost = componentsTotalCost - selectedComponentsCost;
                        componentsOfficeCost = 0;
                    }
                    if (formula !== "office") {
                        components.push(item);
                    }
                });
                const counterData = await this.mongo.db.collection(req.zoiaConfig.collections.counters).findOneAndUpdate({
                    _id: "cmLegacy"
                }, {
                    $inc: {
                        value: 1
                    },
                }, {
                    upsert: true
                });
                if (!counterData || counterData.ok !== 1 || !counterData.value || !counterData.value.value) {
                    rep.requestError(rep, {
                        failed: true,
                        error: "Could not get Legacy counter value",
                        errorKeyword: "legacyCounterError",
                        errorData: []
                    });
                    return;
                }
                cardNumber = `00${counterData.value.value}`;
            } else {
                // Check non-legacy fields
                if (!req.body.cardNumber || req.body.cardNumber < cmData.config.minCardNumber || req.body.cardNumber > cmData.config.maxCardNumber) {
                    rep.requestError(rep, {
                        failed: true,
                        error: "Invalid card number",
                        errorKeyword: "invalidCardNumber",
                        errorData: [{
                            keyword: "invalidCardNumber",
                            dataPath: ".cardNumber"
                        }]
                    });
                    return;
                }
                if (!req.body.price || req.body.price < cmData.config.minCardPrice || req.body.price > cmData.config.maxCardPrice) {
                    rep.requestError(rep, {
                        failed: true,
                        error: "Invalid price",
                        errorKeyword: "invalidPrice",
                        errorData: [{
                            keyword: "invalidPrice",
                            dataPath: ".price"
                        }]
                    });
                    return;
                }
                const existingData = await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmFiles).findOne({
                    cardNumber: req.body.cardNumber,
                    cardType: cardId
                });
                if (existingData) {
                    rep.requestError(rep, {
                        failed: true,
                        error: "Card with such number already exists",
                        errorKeyword: "cardExists",
                        errorData: [{
                            keyword: "cardExists",
                            dataPath: ".cardNumber"
                        }]
                    });
                    return;
                }
            }
            let usernameLetter1;
            let usernameLetter2;
            if (rangeIndex < 27) {
                usernameLetter1 = "A";
            } else if (rangeIndex < 53) {
                usernameLetter1 = "B";
            } else {
                usernameLetter1 = "C";
            }
            if (rangeIndex < 27) {
                usernameLetter2 = String.fromCharCode(65 + rangeIndex);
            } else if (rangeIndex < 53) {
                usernameLetter2 = String.fromCharCode(65 + rangeIndex - 26);
            } else {
                usernameLetter2 = String.fromCharCode(65 + rangeIndex - 52);
            }
            const usernameHId = holdingData.id;
            const usernameRId = cmData.config.holdings[userHolding].roomsId[req.body.room - 1];
            const accountUsername = `L${usernameLetter1}${usernameLetter2}${usernameHId}${usernameRId}${cardNumber}`;
            const accountPassword = `PC${parseInt(cardNumber, 10)}`;
            templateDoc.setData({
                customerName: req.body.customerName,
                customerBirthDate: req.body.customerBirthDate,
                customerAddress: req.body.customerAddress,
                customerPhone: req.body.customerPhone,
                customerEmail: req.body.customerEmail,
                cardNumber,
                day: dateDD,
                month: dateMM,
                year: dateYYYY,
                dateStringMM,
                yearYY: `${dateYYYY[2]}${dateYYYY[3]}`,
                price: utils.rubles(req.body.price),
                price475: utils.rubles(((47.5 / 100) * price).toFixed(2)),
                price95: utils.rubles(((95 / 100) * price).toFixed(2)),
                price5: utils.rubles(((5 / 100) * price).toFixed(2)),
                years: req.body.years,
                yearsString: utils.getRuAgeString(years),
                componentsTotalCost,
                components,
                componentsOfficeCost,
                accountUsername,
                accountPassword,
            });
            templateDoc.render();
            const templateBuf = templateDoc.getZip().generate({
                type: "nodebuffer"
            });
            const tempFilePath = path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.tmp}/${uuid()}.docx`);
            await fs.writeFile(tempFilePath, templateBuf);
            const convertResult = await utils.convertDocxToPDF(tempFilePath, path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.tmp}`));
            await fs.remove(tempFilePath);
            if (!convertResult) {
                rep.requestError(rep, {
                    failed: true,
                    error: "Could not convert file to PDF",
                    errorKeyword: "couldNotConvert",
                    errorData: []
                });
                return;
            }
            const uid = uuid();
            const saveFilename = path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryFiles}/${uid}`);
            const stats = await fs.lstat(convertResult);
            await fs.move(convertResult, saveFilename);
            await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmFiles).updateOne({
                _id: uid
            }, {
                $set: {
                    name: `${userHolding}_${cardId}_${moment().format("DDMMYYYY_HHmm")}.pdf`,
                    size: stats.size,
                    date: new Date(),
                    cardNumber,
                    customerName: req.body.customerName,
                    holding: userHolding,
                    cardType: cardId,
                    username: auth.getUser()._id
                }
            }, {
                upsert: true
            });
            if (req.body.customerEmail && cardId === "legacy") {
                const mailer = new Mailer(this);
                mailer.setRecepient(req.body.customerEmail);
                mailer.setSubject("Legacy");
                mailer.setHTML(this.mailTemplate({
                    subject: "Legacy",
                    preheader: "Ваш сертификат Legacy",
                    content: mailTemplateLegacy({
                        accountUsername,
                        accountPassword
                    })
                }));
                await mailer.send();
            }
            // Send result
            rep.successJSON(rep, {
                uid
            });
            return;
        } catch (e) {
            rep.logError(req, null, e);
            // eslint-disable-next-line consistent-return
            return Promise.reject(e);
        }
    }
});
