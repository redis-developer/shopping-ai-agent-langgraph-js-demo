import { fetchProduct } from '@services/product-service.js';
import { NotificationSystem } from '@components/notifications/notification-system.js';
import { CANVAS_VIEWS } from '@utils/constants.js';

/**
 * Shows a product's details in the canvas, in place of whatever the canvas showed before.
 */
export class ProductView {
    /**
     * @param {string} canvasId
     * @param {string} closeButtonId
     * @param {import('./product-detail.js').ProductDetail} productDetail - The product's markup in the canvas, which this fills in.
     */
    constructor(canvasId, closeButtonId, productDetail) {
        this.canvas = document.getElementById(canvasId);
        this.closeButton = document.getElementById(closeButtonId);
        this.productDetail = productDetail;
        this.previousView = CANVAS_VIEWS.HOME; // What the canvas goes back to when the product is closed
        this.init();
    }

    init() {
        this.closeButton.addEventListener('click', () => this.close());
    }

    /**
     * @param {{id: string, image: string}} productSummary - The product as its card shows it. The card's image is used, since the product has none.
     */
    async open(productSummary) {
        try {
            this.productDetail.fill(await fetchProduct(productSummary.id), productSummary.image);
        } catch (error) {
            console.error('Error loading the product:', error);
            NotificationSystem.error('Could not load that product. Please try again.');
            return;
        }

        this.previousView = this.canvas.dataset.view;
        this.canvas.dataset.view = CANVAS_VIEWS.PRODUCT;
    }

    close() {
        this.canvas.dataset.view = this.previousView;
    }
}
