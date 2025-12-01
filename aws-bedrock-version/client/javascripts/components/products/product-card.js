export class ProductCard {
    constructor(onProductAdd = null) {
        this.onProductAdd = onProductAdd;
        this.init();
    }

    init() {
        const addBtns = document.querySelectorAll('.brutal-add-btn');
        addBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleProductAdd(e));
        });

        const categoryCards = document.querySelectorAll('.brutal-category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', (e) => this.handleCategoryClick(e));
        });
    }

    handleProductAdd(e) {
        e.preventDefault();
        const productCard = e.target.closest('.brutal-product-card');
        const productName = productCard.querySelector('h4').textContent;

        if (this.onProductAdd) {
            this.onProductAdd(productName);
        }

        e.target.style.transform = 'scale(0.95)';
        setTimeout(() => {
            e.target.style.transform = 'scale(1)';
        }, 150);
    }

    handleCategoryClick(e) {
        const categoryName = e.currentTarget.querySelector('span').textContent;

        if (this.onProductAdd) {
            this.onProductAdd(null, categoryName);
        }
    }
}
