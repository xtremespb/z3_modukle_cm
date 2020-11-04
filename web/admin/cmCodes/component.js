const Cookies = require("../../../../../shared/lib/cookies").default;

module.exports = class {
    onCreate(input, out) {
        this.state = {
            processValue: null,
            loading: false
        };
        this.language = out.global.language;
        this.routes = out.global.routes;
        this.cookieOptions = out.global.cookieOptions;
        this.siteOptions = out.global.siteOptions;
        this.i18n = out.global.i18n;
    }

    onMount() {
        this.state.processValue = (id, value) => value;
        const cookies = new Cookies(this.cookieOptions);
        this.token = cookies.get(`${this.siteOptions.id || "zoia3"}.authToken`);
        this.notify = this.getComponent("cmCodes_mnotify");
        this.importModal = this.getComponent("cmCodes_importModal");
    }

    onTopButtonClick(data) {
        switch (data.button) {
        case "btnReload":
            this.getComponent("cmCodesTable").func.dataRequest();
            break;
        case "btnImportCodes":
            this.importModal.func.setActive(true);
            break;
        }
    }

    onUnauthorized() {
        window.location.href = this.i18n.getLocalizedURL(`${this.routes.login}?_=${new Date().getTime()}`, this.language);
    }
};
