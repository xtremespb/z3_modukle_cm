import fs from "fs-extra";
import path from "path";
import Auth from "../../../../shared/lib/auth";
import template from "./template.marko";
import C from "../../../../shared/lib/constants";
import moduleData from "../../module.json";

export default () => ({
    async handler(req, rep) {
        const auth = new Auth(this.mongo.db, this, req, rep, C.USE_COOKIE_FOR_TOKEN);
        try {
            const site = new req.ZoiaSite(req, "cm", this.mongo.db);
            const response = new this.Response(req, rep, site);
            if (!(await auth.getUserData()) || !auth.checkStatus("admin")) {
                auth.clearAuthCookie();
                return response.redirectToLogin(req.zoiaModulesConfig["cm"].routes.admin);
            }
            site.setAuth(auth);
            const dir = path.resolve(`${__dirname}/../../${req.zoiaConfig.directories.files}/${req.zoiaModulesConfig["cm"].directoryTemplates}`);
            const files = await fs.readdir(dir);
            const data = (await this.mongo.db.collection(req.zoiaConfig.collections.registry).findOne({
                _id: "cm_data"
            })) || {};
            data.config = data.config || {};
            const render = await template.stream({
                $global: {
                    serializedGlobals: {
                        template: true,
                        pageTitle: true,
                        files: true,
                        routeDownload: true,
                        codeTypes: true,
                        ...site.getSerializedGlobals()
                    },
                    template: "admin",
                    pageTitle: `${site.i18n.t("moduleTitle")} | ${site.i18n.t("adminPanel")}`,
                    files,
                    routeDownload: req.zoiaModulesConfig["cm"].routes.download,
                    codeTypes: data.config.codeTypes || [],
                    ...await site.getGlobals(),
                },
                modules: req.zoiaModules,
                moduleId: moduleData.id,
            });
            return response.sendHTML(render);
        } catch (e) {
            return Promise.reject(e);
        }
    }
});
