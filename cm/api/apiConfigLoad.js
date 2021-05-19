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
