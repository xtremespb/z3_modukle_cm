import importCodes from "./data/importCodes.json";
import Auth from "../../../shared/lib/auth";
import C from "../../../shared/lib/constants";

export default () => ({
    schema: {
        body: importCodes.root
    },
    attachValidation: true,
    async handler(req, rep) {
        const response = new this.Response(req, rep);
        const log = new this.LoggerHelpers(req, this);
        // Check permissions
        const auth = new Auth(this.mongo.db, this, req, rep, C.USE_BEARER_FOR_TOKEN);
        if (!(await auth.getUserData()) || !auth.checkStatus("active")) {
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
            const cmData = (await this.mongo.db.collection(req.zoiaConfig.collections.registry).findOne({
                _id: "cm_data"
            })) || {};
            cmData.config = cmData.config || {};
            cmData.config.codeTypes = cmData.config.codeTypes || [];
            if (cmData.config.codeTypes.indexOf(req.body.codeType) < 0) {
                response.requestError({
                    failed: true,
                    error: "Invalid Code Type",
                    errorKeyword: "invalidCodeType",
                    errorData: [{
                        keyword: "invalidCodeType",
                        dataPath: ".codeType"
                    }]
                });
                return;
            }
            const codes = Array.from(new Set(req.body.codes.split(/\n/).map(i => i.trim()).filter(i => i && i.length)));
            const existingCount = await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmCodes).find({
                $or: codes.map(c => ({
                    code: c
                }))
            }).count();
            if (existingCount) {
                response.requestError({
                    failed: true,
                    error: "One or more codes are duplicated",
                    errorKeyword: "duplicateCodes",
                    errorData: [{
                        keyword: "duplicateCodes",
                        dataPath: ".codes"
                    }]
                });
                return;
            }
            const insertData = codes.map(c => ({
                code: c,
                importDate: new Date(),
                codeType: req.body.codeType
            }));
            const result = await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmCodes).insertMany(insertData, {
                ordered: true
            });
            // Send result
            response.successJSON({
                count: result.insertedCount
            });
            return;
        } catch (e) {
            log.error(e);
            // eslint-disable-next-line consistent-return
            return Promise.reject(e);
        }
    }
});
