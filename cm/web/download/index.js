import fs from "fs-extra";
import path from "path";

export default () => ({
    async handler(req, rep) {
        if (!req.query.id || typeof req.query.id !== "string" || !req.query.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)) {
            rep.callNotFound();
            return rep.code(204);
        }
        try {
            const {
                response,
                auth,
            } = req.zoia;
            const site = new req.ZoiaSite(req, "cm", this.mongo.db);
            response.setSite(site);
            if (!auth.checkStatus("active")) {
                auth.clearAuthCookie();
                return response.redirectToLogin(req.zoiaModulesConfig["cm"].routes.cm);
            }
            site.setAuth(auth);
            const file = await this.mongo.db.collection(req.zoiaModulesConfig["cm"].collectionCmFiles).findOne({
                _id: req.query.id
            });
            if (!file) {
                rep.callNotFound();
                return rep.code(204);
            }
            const stream = fs.createReadStream(path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryFiles}/${file._id}`));
            rep.code(200).headers({
                "Content-Disposition": `attachment; filename="${file.name}"`,
                "Content-Type": "application/pdf"
            }).send(stream);
        } catch (e) {
            return Promise.reject(e);
        }
    }
});
