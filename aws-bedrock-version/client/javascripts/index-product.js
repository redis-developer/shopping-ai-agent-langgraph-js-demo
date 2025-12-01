import { ProductApp } from './product-app.js';

document.addEventListener('DOMContentLoaded', () => {
    // Extract product info from page
    const productId = document.querySelector('[data-product-id]')?.dataset.productId ||
                     new URLSearchParams(window.location.search).get('productId') ||
                     window.location.pathname.split('/').pop();

    const productCategory = document.querySelector('[data-product-category]')?.dataset.productCategory;

    // Initialize the product app
    const productApp = new ProductApp(productId, productCategory);

    // Make app globally accessible for debugging
    window.productApp = productApp;
});
