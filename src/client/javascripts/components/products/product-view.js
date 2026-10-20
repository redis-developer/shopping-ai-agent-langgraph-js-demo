/**
 * Shows the product page (/products/:id) in the canvas, in place of the page sections.
 */
export class ProductView {
    constructor(homeId, viewId, frameId, closeButtonId) {
        this.home = document.getElementById(homeId);
        this.view = document.getElementById(viewId);
        this.frame = document.getElementById(frameId);
        this.closeButton = document.getElementById(closeButtonId);
        this.init();
    }

    init() {
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.close());
        }
    }

    open(productId) {
        this.frame.src = `/products/${productId}`;
        this.home.hidden = true;
        this.view.hidden = false;
    }

    close() {
        this.view.hidden = true;
        this.home.hidden = false;
        this.frame.src = 'about:blank';
    }
}
