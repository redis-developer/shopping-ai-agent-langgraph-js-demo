export class ProductQuantity {
    constructor(inputId = 'quantity', minValue = 1, maxValue = 10) {
        this.input = document.getElementById(inputId);
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.init();
    }

    init() {
        // Ensure initial value is within bounds
        if (this.input) {
            const currentValue = parseInt(this.input.value) || this.minValue;
            this.input.value = Math.max(this.minValue, Math.min(this.maxValue, currentValue));
        }
    }

    changeQuantity(delta) {
        if (!this.input) return;

        const currentValue = parseInt(this.input.value) || this.minValue;
        const newValue = Math.max(this.minValue, Math.min(this.maxValue, currentValue + delta));
        this.input.value = newValue;
    }

    getQuantity() {
        return this.input ? parseInt(this.input.value) || this.minValue : this.minValue;
    }

    setQuantity(value) {
        if (this.input) {
            const safeValue = Math.max(this.minValue, Math.min(this.maxValue, parseInt(value) || this.minValue));
            this.input.value = safeValue;
        }
    }
}
