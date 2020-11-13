import Auth from "../../../../shared/lib/auth";
import template from "./template.marko";
import C from "../../../../shared/lib/constants";

export default () => ({
    async handler(req, rep) {
        const auth = new Auth(this.mongo.db, this, req, rep, C.USE_COOKIE_FOR_TOKEN);
        try {
            const site = new req.ZoiaSite(req, "cm", this.mongo.db);
            const response = new this.Response(req, rep, site);
            if (!(await auth.getUserData()) || !auth.checkStatus("active")) {
                auth.clearAuthCookie();
                return response.redirectToLogin(req.zoiaModulesConfig["cm"].routes.frontend);
            }
            site.setAuth(auth);
            const cmData = (await this.mongo.db.collection(req.zoiaConfig.collections.registry).findOne({
                _id: "cm_data"
            })) || {
                config: {
                    commom: {},
                    holdings: {},
                    legacy: {
                        components: [],
                        ranges: []
                    }
                }
            };
            let userHolding;
            let userHoldingData;
            if (cmData && cmData.config && cmData.config.holdings && auth.checkGroup("cm")) {
                Object.keys(cmData.config.holdings).map(h => {
                    if (auth.checkGroup(h)) {
                        userHolding = h;
                    }
                });
                userHoldingData = userHolding ? cmData.config.holdings[userHolding] : {};
            }
            const render = await template.stream({
                $global: {
                    serializedGlobals: {
                        template: true,
                        pageTitle: true,
                        common: true,
                        userHolding: true,
                        userHoldingData: true,
                        routeDownload: true,
                        legacy: true,
                        ...site.getSerializedGlobals()
                    },
                    template: req.zoiaTemplates[0],
                    pageTitle: site.i18n.t("frontend"),
                    common: cmData.config.common && cmData.config && cmData.config.common ? cmData.config.common : {},
                    userHolding,
                    userHoldingData,
                    routeDownload: req.zoiaModulesConfig["cm"].routes.download,
                    legacy: cmData.config.legacy,
                    ...await site.getGlobals(),
                }
            });
            return response.sendHTML(render);
        } catch (e) {
            return Promise.reject(e);
        }
    }
});
