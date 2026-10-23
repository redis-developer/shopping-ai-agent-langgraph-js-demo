export class ProductCard {
    constructor(onProductAdd = null) {
        this.onProductAdd = onProductAdd;
        this.init();
    }

    init() {
        const addBtns = document.querySelectorAll('.add-btn');
        addBtns.forEach(btn => {
            btn.addEventListener('click', (event) => this.handleProductAdd(event));
        });

        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', (event) => this.handleCategoryClick(event));
        });
    }

    handleProductAdd(event) {
        event.preventDefault();
        const productCard = event.target.closest('.product-card');
        const productName = productCard.querySelector('h4').textContent;

        if (this.onProductAdd) {
            this.onProductAdd(productName);
        }

        const button = event.currentTarget;
        button.classList.add('pulse');
        setTimeout(() => button.classList.remove('pulse'), 150);
    }

    handleCategoryClick(event) {
        const categoryName = event.currentTarget.querySelector('span').textContent;

        if (this.onProductAdd) {
            this.onProductAdd(null, categoryName);
        }
    }
}
