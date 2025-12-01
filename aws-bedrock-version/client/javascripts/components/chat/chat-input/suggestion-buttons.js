export class SuggestionButtons {
    constructor(onSuggestionClick = null) {
        this.onSuggestionClick = onSuggestionClick;
        this.init();
    }

    init() {
        const suggestionBtns = document.querySelectorAll('.brutal-suggestion-btn');
        suggestionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.target.getAttribute('data-text');
                if (text && this.onSuggestionClick) {
                    this.onSuggestionClick(text);
                }
            });
        });
    }
}
