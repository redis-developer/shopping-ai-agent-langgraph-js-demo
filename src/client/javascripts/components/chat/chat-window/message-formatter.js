export class MessageFormatter {
    static formatMessage(message) {
        // Escape first, so text from the model or the shopper can never become markup
        return message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/₹(\d+)/g, '<span class="price">₹$1</span>');
    }

    static formatTimestamp(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
}
