import { DOM_IDS } from '@utils/constants.js';

export class TypingIndicator {
    constructor(messagesContainer) {
        this.messagesContainer = messagesContainer;
        this.taskList = null; // The list of tasks of the turn that is running
        this.tasks = new Map(); // The element of each task in that list, by the key of its step
    }

    show() {
        if (!this.messagesContainer) return;

        this.taskList = null;
        this.tasks.clear();
        this.messagesContainer.appendChild(document.getElementById(DOM_IDS.TYPING_INDICATOR_TEMPLATE).content.firstElementChild.cloneNode(true));
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * Shows a task of the assistant in a list above the reply: it is marked as running when its step starts
     * and as done, with how long it took, when the step finishes. The list stays in the chat after the reply.
     * @param {{key: string, label: string, status: 'started'|'finished', durationMs?: number}} step
     */
    showTask({ key, label, status, durationMs }) {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (!typingIndicator) return;

        if (!this.taskList) {
            const taskProgress = document.getElementById(DOM_IDS.TASK_PROGRESS_TEMPLATE).content.firstElementChild.cloneNode(true);
            this.taskList = taskProgress.querySelector('.task-list');
            // Above the dots, so the reply, which is added before the dots, comes after the list
            typingIndicator.before(taskProgress);
        }

        let task = this.tasks.get(key);
        if (!task) {
            task = document.getElementById(DOM_IDS.TASK_TEMPLATE).content.firstElementChild.cloneNode(true);
            task.querySelector('progress').setAttribute('aria-label', label);
            task.querySelector('.task-label').textContent = label;
            this.tasks.set(key, task);
            this.taskList.appendChild(task);
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }

        // A progress bar without a value is busy, and one that is full is done
        const progress = task.querySelector('progress');
        task.classList.toggle('running', status === 'started');
        if (status === 'finished') {
            progress.max = 1;
            progress.value = 1;
        }
        if (durationMs !== undefined) {
            const duration = task.querySelector('.task-duration');
            duration.textContent = `${durationMs} ms`;
            duration.dateTime = `PT${durationMs / 1000}S`;
        }
    }

    // Removes the dots only. The list of tasks stays.
    hide() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}
