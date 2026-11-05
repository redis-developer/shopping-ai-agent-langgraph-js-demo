import { CANVAS_VIEWS, DOM_IDS } from '@utils/constants.js';

/**
 * Shows what came with the assistant's answers (its attachments) in the canvas, one answer at a time.
 * Every answer that came with attachments is a result set. The arrows step through the sets,
 * and the close button takes the shopper back to the page sections.
 * It does not know what an attachment is. A renderer for each attachment type draws it.
 */
export class ResultsView {
    /**
     * @param {Record<string, (data: Object) => HTMLElement>} renderers - For each attachment type, what draws the data of an attachment of that type. An attachment of another type is left out.
     * @param {(messageElement: HTMLElement) => void} onNavigate - Called with the assistant's message when an arrow moves to its result set.
     */
    constructor(renderers, onNavigate) {
        this.canvas = document.getElementById(DOM_IDS.CANVAS);
        this.title = document.getElementById(DOM_IDS.RESULTS_TITLE);
        this.pager = document.getElementById(DOM_IDS.RESULTS_PAGER);
        this.position = document.getElementById(DOM_IDS.RESULTS_POSITION);
        this.previousButton = document.getElementById(DOM_IDS.RESULTS_PREVIOUS);
        this.nextButton = document.getElementById(DOM_IDS.RESULTS_NEXT);
        this.closeButton = document.getElementById(DOM_IDS.CLOSE_RESULTS_VIEW);
        this.list = document.getElementById(DOM_IDS.RESULTS_LIST);
        this.renderers = renderers;
        this.onNavigate = onNavigate;
        this.resultSets = []; // One for each answer with attachments: { question, attachments, messageElement }
        this.activeIndex = 0;
        this.init();
    }

    init() {
        this.previousButton.addEventListener('click', () => this.move(-1));
        this.nextButton.addEventListener('click', () => this.move(1));
        this.closeButton.addEventListener('click', () => this.close());
    }

    /**
     * Adds the attachments of an answer as a new result set and shows it. An answer without attachments to draw adds nothing.
     * @param {string} question - What the shopper asked, shown as the title.
     * @param {Array<{type: string, data: Object}>} [attachments] - The content that came with the answer.
     * @param {HTMLElement} [messageElement] - The assistant's message, which the arrows scroll the chat to. The attachments can be known before the message is finished, so it can be linked later.
     * @returns {boolean} Whether a result set was added.
     */
    add(question, attachments = [], messageElement = null) {
        const drawable = attachments.filter((attachment) => attachment.type in this.renderers);
        if (drawable.length === 0) return false;

        this.resultSets.push({ question, attachments: drawable, messageElement });
        this.activeIndex = this.resultSets.length - 1;
        this.render();
        this.canvas.dataset.view = CANVAS_VIEWS.RESULTS;
        return true;
    }

    /**
     * Links the assistant's finished message to the latest result set, for the arrows to scroll to.
     * @param {HTMLElement} messageElement
     */
    linkMessage(messageElement) {
        this.resultSets.at(-1).messageElement = messageElement;
    }

    /**
     * Moves to the previous or the next result set.
     * @param {-1 | 1} step
     */
    move(step) {
        this.activeIndex += step;
        this.render();

        // The latest set has no message until its reply is finished
        const { messageElement } = this.resultSets[this.activeIndex];
        if (messageElement) {
            this.onNavigate(messageElement);
        }
    }

    /** Shows the page sections again. The result sets are kept, and the arrows reach them when a new answer brings attachments. */
    close() {
        this.canvas.dataset.view = CANVAS_VIEWS.HOME;
    }

    /** Forgets every result set, for a new chat or another session. */
    clear() {
        this.resultSets = [];
        this.activeIndex = 0;
        this.list.replaceChildren();
        this.canvas.dataset.view = CANVAS_VIEWS.HOME;
    }

    render() {
        const { question, attachments } = this.resultSets[this.activeIndex];

        this.title.textContent = `Results for “${question}”`;
        // With only one set there is nothing to step through
        this.pager.hidden = this.resultSets.length < 2;
        this.position.textContent = `${this.activeIndex + 1} / ${this.resultSets.length}`;
        this.previousButton.disabled = this.activeIndex === 0;
        this.nextButton.disabled = this.activeIndex === this.resultSets.length - 1;
        this.list.replaceChildren(...attachments.map((attachment) => this.renderers[attachment.type](attachment.data)));
    }
}
