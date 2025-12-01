export class SearchBar {
    constructor(formSelector, inputSelector, onSearch = null) {
        this.form = document.querySelector(formSelector);
        this.input = document.querySelector(inputSelector);
        this.onSearch = onSearch;
        this.init();
    }

    init() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const query = this.input.value.trim();

        if (!query) return;

        if (this.onSearch) {
            this.onSearch(query);
        }

        this.input.value = '';
    }
}
