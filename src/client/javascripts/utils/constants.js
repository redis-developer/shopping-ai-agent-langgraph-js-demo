export const DOM_IDS = {
    CHAT_FORM: 'chat-form', // The form the shopper types a message in
    CHAT_INPUT: 'chat-input', // The text box of that form
    CHAT_MESSAGES: 'chat-messages', // The list the chat messages are added to
    CHAT_TAB: 'chat-tab', // The tab button for the chat
    CONTEXT_TAB: 'context-tab', // The tab button for the context (memory) panel
    CHAT_CONTENT: 'chat-content', // The chat tab's content
    CONTEXT_PANEL: 'context-panel', // The context tab's content
    CONTEXT_PREFERENCES: 'context-preferences', // The list of remembered preferences in the context panel
    CONTEXT_SUMMARY: 'context-summary', // The summary of the conversation in the context panel
    CONTEXT_SESSIONS: 'context-sessions', // The list of earlier sessions in the context panel
    CONTEXT_SESSION_TEMPLATE: 'context-session-template', // Template for one earlier session in that list
    LOOKUP_SIMILAR_RESPONSES_TOGGLE: 'lookup-similar-responses-toggle', // Switch for answering from similar earlier responses
    CANVAS: 'canvas', // The main pane, which shows the home page, the results or a product
    CLOSE_PRODUCT_VIEW: 'close-product-view', // Button that goes back from a product to what the main pane showed before
    RESULTS_TITLE: 'results-title', // Heading of the results in the main pane
    RESULTS_PAGER: 'results-pager', // The arrows and position that step through the sets of results
    RESULTS_POSITION: 'results-position', // Which set is showing, like "2 / 3"
    RESULTS_PREVIOUS: 'results-previous', // Arrow to the previous set of results
    RESULTS_NEXT: 'results-next', // Arrow to the next set of results
    CLOSE_RESULTS_VIEW: 'close-results-view', // The X that closes the results and shows the home page
    RESULTS_LIST: 'results-list', // The list the product cards of a set are added to
    PRODUCT_CARD_TEMPLATE: 'product-card-template', // Template for one product card
    USER_MESSAGE_TEMPLATE: 'user-message-template', // Template for a message the shopper sent
    ASSISTANT_MESSAGE_TEMPLATE: 'assistant-message-template', // Template for a reply of the assistant
    RESPONSE_INFO_TEMPLATE: 'response-info-template', // Template for the usage breakdown under a reply
    TYPING_INDICATOR_TEMPLATE: 'typing-indicator-template', // Template for the dots shown while the assistant works
    TASK_PROGRESS_TEMPLATE: 'task-progress-template', // Template for the tasks of the assistant, which stay above the reply
    TASK_TEMPLATE: 'task-template', // Template for one task in that list
    NEW_CHAT_MESSAGE_TEMPLATE: 'new-chat-message-template', // Template for the message shown in an empty chat
    REPLY_FOOTER_TEMPLATE: 'reply-footer-template', // Template for what goes under a reply (follow-up buttons)
    SUGGESTION_TEMPLATE: 'suggestion-template' // Template for one suggested follow-up button
};

// What the canvas shows, one at a time. It is the data-view of the canvas, and the CSS shows the matching section.
export const CANVAS_VIEWS = {
    HOME: 'home',
    RESULTS: 'results',
    PRODUCT: 'product'
};

export const CSS_SELECTORS = {
    SEARCH_BAR: '.search-bar',
    MAIN_SEARCH: '.main-search',
    CART_COUNT: '.cart-count'
};
