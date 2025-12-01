export class ChatInput {
    constructor(formId, inputId, onSubmit = null) {
        this.form = document.getElementById(formId);
        this.input = document.getElementById(inputId);
        this.onSubmit = onSubmit;
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const message = this.input.value.trim();

        if (!message) return;

        this.input.value = '';

        if (this.onSubmit) {
            this.onSubmit(message);
        }
    }

    setValue(value) {
        if (this.input) {
            this.input.value = value;
        }
    }

    focus() {
        if (this.input) {
            this.input.focus();
        }
    }

    getValue() {
        return this.input ? this.input.value : '';
    }
}
