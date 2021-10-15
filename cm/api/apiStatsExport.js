import XlsxTemplate from "xlsx-template";
import fs from "fs-extra";
import path from "path";
import moment from "moment";
import {
    v4 as uuid
} from "uuid";
import generateData from "./data/stats.json";

export default () => ({
    schema: {
        body: generateData.schema
    },
    attachValidation: true,
    async handler(req) {
        const {
            log,
            response,
            auth,
        } = req.zoia;
        // Check permissions
        if (!auth.checkStatus("admin")) {
            response.unauthorizedError();
            return;
        }
        // Validate form
        if (req.validationError) {
            log.error(null, req.validationError ? req.validationError.message : "Request Error");
            response.validationError(req.validationError || {});
            return;
        }
        try {
            const query = {};
            if (req.body.dateFrom) {
                query.$and = query.$and || [];
                query.$and.push({
                    date: {
                        $gte: moment(req.body.dateFrom, "YYYYMMDD").startOf("day").toDate()
                    }
                });
            }
            if (req.body.dateTo) {
                query.$and = query.$and || [];
                query.$and.push({
                    date: {
                        $lte: moment(req.body.dateTo, "YYYYMMDD").endOf("day").toDate()
                    }
                });
            }
            const dataDb = (await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmStats).find(query).toArray()) || [];
            const templatePath = path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryTemplates}/stats.xlsx`);
            const templateContent = await fs.readFile(templatePath, "binary");
            const template = new XlsxTemplate(templateContent);
            template.substitute(1, {
                items: dataDb.map(i => ({
                    ...i,
                    date: moment(i.date).format("DD.MM.YYYY"),
                }))
            });
            const data = template.generate();
            const uuidExport = uuid();
            const saveExportFilename = path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryFiles}/${uuidExport}`);
            await fs.writeFile(saveExportFilename, data, "binary");
            const statsExport = await fs.lstat(saveExportFilename);
            await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmFiles).updateOne({
                _id: uuidExport
            }, {
                $set: {
                    hidden: true,
                    name: `${moment().format("DDMMYYYY_HHmm")}_report.xlsx`,
                    size: statsExport.size,
                    date: new Date(),
                }
            }, {
                upsert: true
            });
            // Send result
            response.successJSON({
                uuid: uuidExport,
            });
            return;
        } catch (e) {
            log.error(e);
            // eslint-disable-next-line consistent-return
            return Promise.reject(e);
        }
    }
});
