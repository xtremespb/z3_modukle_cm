import path from "path";
import fs from "fs-extra";
import filesDelete from "./data/filesDelete.json";

export default () => ({
    schema: {
        body: filesDelete.root
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
            log.error(null, req.validationError.message);
            response.validationError(req.validationError);
            return;
        }
        try {
            // Build query
            const query = {
                $or: req.body.ids.map(id => ({
                    _id: id
                }))
            };
            // Get list of records
            const files = await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmFiles).find(query).toArray();
            await Promise.allSettled(files.map(async b => {
                try {
                    const file = path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryFiles}/${b._id}`);
                    await fs.remove(file);
                } catch {
                    // Ignore
                }
            }));
            // Delete requested IDs
            const result = await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmFiles).deleteMany(query);
            // Check result
            if (!result || !result.result || !result.result.ok) {
                response.requestError({
                    failed: true,
                    error: "Could not delete one or more items",
                    errorKeyword: "deleteError",
                    errorData: []
                });
                return;
            }
            // Send "success" result
            response.successJSON();
            return;
        } catch (e) {
            log.error(e);
            response.internalServerError(e.message);
        }
    }
});
