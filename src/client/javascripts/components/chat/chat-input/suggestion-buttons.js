export class SuggestionButtons {
    /**
     * @param {string} containerId - The element the buttons are in. Buttons added to it later work too.
     * @param {(text: string) => void} onSuggestionClick - Called with the text of the clicked button.
     */
    constructor(containerId, onSuggestionClick) {
        document.getElementById(containerId).addEventListener('click', (event) => {
            const text = event.target.closest('.suggestion-btn')?.getAttribute('data-text');
            if (text) {
                onSuggestionClick(text);
            }
        });
    }
}
