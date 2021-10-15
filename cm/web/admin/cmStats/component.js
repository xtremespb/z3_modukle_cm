const axios = require("axios");
const Cookies = require("../../../../../shared/lib/cookies").default;

module.exports = class {
    onCreate(input, out) {
        this.i18n = out.global.i18n;
        this.cookieOptions = out.global.cookieOptions;
        this.siteId = out.global.siteId;
        this.routeDownload = out.global.routeDownload;
    }

    async onMount() {
        const cookies = new Cookies(this.cookieOptions);
        this.token = cookies.get(`${this.siteId || "zoia3"}.authToken`);
        this.mNotify = this.getComponent("statsExport_mnotify");
    }

    async onButtonClick() {
        const data = this.getComponent("statsExportForm").func.serialize().__default;
        this.getComponent("statsExportForm").func.setProgress(true);
        try {
            const res = await axios({
                method: "post",
                url: "/api/cm/stats/export",
                data: {
                    dateFrom: data.dateFrom,
                    dateTo: data.dateTo,
                },
                headers: {
                    Authorization: `Bearer ${this.token}`
                }
            });
            window.open(
                `${this.routeDownload}?id=${res.data.uuid}`,
                "_blank"
            );
        } catch {
            this.getComponent("statsExport_mnotify").func.show(this.i18n.t("exportError"), "is-danger");
        }
        this.getComponent("statsExportForm").func.setProgress(false);
    }
};
