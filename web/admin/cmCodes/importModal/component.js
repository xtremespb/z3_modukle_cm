module.exports = class {
    onCreate(input, out) {
        const state = {
            active: false,
            loading: false
        };
        this.state = state;
        this.func = {
            setActive: this.setActive.bind(this),
        };
        this.i18n = out.global.i18n;
    }

    onMount() {
        this.codesImportForm = this.getComponent("codesImportForm");
    }

    setActive(state) {
        if (!state && this.state.loading) {
            return;
        }
        this.state.active = state;
    }

    onCloseClick() {
        if (this.state.loading) {
            return;
        }
        this.setActive(false);
    }

    async onConfirmClick() {
        if (this.state.loading) {
            return;
        }
        this.state.loading = true;
        this.codesImportForm.func.submitForm();
    }

    onUnauthorized() {
        window.location.href = this.i18n.getLocalizedURL(`${this.routes.login}?_=${new Date().getTime()}`, this.language);
    }

    onPostSuccess(res) {
        this.state.loading = false;
        this.setActive(false);
        this.emit("import-success", res.data.count || 0);
    }

    onPostFail() {
        this.state.loading = false;
    }

    onValidationFail() {
        this.state.loading = false;
    }
};
