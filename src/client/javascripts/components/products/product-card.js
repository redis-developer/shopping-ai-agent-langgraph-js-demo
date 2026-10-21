export class ProductCard {
    constructor(onProductAdd = null) {
        this.onProductAdd = onProductAdd;
        this.init();
    }

    init() {
        const addBtns = document.querySelectorAll('.add-btn');
        addBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleProductAdd(e));
        });

        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', (e) => this.handleCategoryClick(e));
        });
    }

    handleProductAdd(e) {
        e.preventDefault();
        const productCard = e.target.closest('.product-card');
        const productName = productCard.querySelector('h4').textContent;

        if (this.onProductAdd) {
            this.onProductAdd(productName);
        }

        const button = e.currentTarget;
        button.classList.add('pulse');
        setTimeout(() => button.classList.remove('pulse'), 150);
    }

    handleCategoryClick(e) {
        const categoryName = e.currentTarget.querySelector('span').textContent;

        if (this.onProductAdd) {
            this.onProductAdd(null, categoryName);
        }
    }
}
