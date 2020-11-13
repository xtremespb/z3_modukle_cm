import Auth from "../../../shared/lib/auth";
import C from "../../../shared/lib/constants";

export default () => ({
    attachValidation: false,
    async handler(req, rep) {
        const response = new this.Response(req, rep);
        const log = new this.LoggerHelpers(req, this);
        // Check permissions
        const auth = new Auth(this.mongo.db, this, req, rep, C.USE_BEARER_FOR_TOKEN);
        if (!(await auth.getUserData()) || !auth.checkStatus("admin")) {
            response.unauthorizedError();
            return;
        }
        // Get ID from body
        try {
            const data = (await this.mongo.db.collection(req.zoiaConfig.collections.registry).findOne({
                _id: "cm_data"
            })) || {};
            data.config = data.config ? JSON.stringify(data.config, null, "\t") : "";
            data.attachments = [];
            // Return "success" result
            response.successJSON({
                data
            });
            return;
        } catch (e) {
            // There is an exception, send error 500 as response
            log.error(e);
            response.internalServerError(e.message);
        }
    }
});
