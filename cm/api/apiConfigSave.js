import path from "path";
import fs from "fs-extra";
import configEdit from "./data/configEdit.json";

export default () => ({
    attachValidation: false,
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
        // Initialize validator
        const formData = await req.processMultipart();
        const extendedValidation = new req.ExtendedValidation(formData, configEdit.root, null, configEdit.files, Object.keys(req.zoiaConfig.languages));
        // Perform validation
        const extendedValidationResult = extendedValidation.validate();
        // Check if there are any validation errors
        if (extendedValidationResult.failed) {
            log.error(null, extendedValidationResult.message);
            response.validationError(extendedValidationResult);
            return;
        }
        const root = path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryTemplates}`).replace(/\\/gm, "/");
        // Get ID from body
        try {
            // Get data from form body
            const dataRaw = extendedValidation.getData();
            const data = extendedValidation.filterDataFiles(dataRaw);
            // Get files from body
            const uploadFiles = extendedValidation.getFiles();
            // Upload files
            if (uploadFiles && uploadFiles.length) {
                let uploadError;
                await Promise.allSettled(uploadFiles.map(async f => {
                    try {
                        const filename = path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryTemplates}/${f.name}`).replace(/\\/gm, "/");
                        if (filename.indexOf(root) !== 0) {
                            throw new Error("Invalid file path");
                        }
                        try {
                            await fs.remove(filename);
                        } catch {
                            // Ignore
                        }
                        await fs.move(formData.files[f.id].filePath, filename);
                    } catch (e) {
                        uploadError = true;
                    }
                }));
                await req.removeMultipartTempFiles(formData.files);
                if (uploadError) {
                    response.requestError({
                        failed: true,
                        error: "File upload error",
                        errorKeyword: "uploadError",
                        errorData: []
                    });
                    return;
                }
            }
            await req.removeMultipartTempFiles(formData.files);
            // Check JSON
            try {
                data.config = JSON.parse(data.config);
            } catch {
                response.requestError({
                    failed: true,
                    error: "JSON parse error",
                    errorKeyword: "jsonError",
                    errorData: []
                });
                return;
            }
            data.attachments = [];
            // Save data
            const update = await this.mongo.db.collection(req.zoiaConfig.collections.registry).updateOne({
                _id: "cm_data"
            }, {
                $set: {
                    ...data,
                    modifiedAt: new Date(),
                }
            }, {
                upsert: true
            });
            // Check result
            if (!update || !update.acknowledged) {
                response.requestError({
                    failed: true,
                    error: "Database error",
                    errorKeyword: "databaseError",
                    errorData: []
                });
                return;
            }
            // Return "success" result
            response.successJSON();
            return;
        } catch (e) {
            // There is an exception, send error 500 as response
            log.error(e);
            response.internalServerError(e.message);
        }
    }
});
