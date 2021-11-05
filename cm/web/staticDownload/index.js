import fs from "fs-extra";
import path from "path";

export default () => ({
    async handler(req, rep) {
        if (!req.query.type || typeof req.query.type !== "string" || !req.query.type.match(/^(offer|tech|first10)$/)) {
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
            let filename;
            switch (req.query.type) {
            case "offer":
                filename = "offer";
                break;
            case "first10":
                filename = "offer_first10";
                break;
            default:
                filename = "tech_service";
            }
            const stream = fs.createReadStream(path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryTemplates}/${filename}.pdf`));
            rep.code(200).headers({
                // "Content-Disposition": `attachment; filename="${filename}_${uuid()}.pdf"`,
                "Content-Type": "application/pdf"
            }).send(stream);
        } catch (e) {
            return Promise.reject(e);
        }
    }
});
