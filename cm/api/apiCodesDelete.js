import {
    ObjectId
} from "mongodb";
import codesDelete from "./data/codesDelete.json";

export default () => ({
    schema: {
        body: codesDelete.root
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
                    _id: new ObjectId(id)
                }))
            };
            const result = await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmCodes).deleteMany(query);
            // Check result
            if (!result || !result.acknowledged) {
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
