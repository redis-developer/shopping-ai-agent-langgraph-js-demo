import { loadProductsFromCSV, checkRedisMemory } from '../services/products/data/product-loader.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    try {
        console.log('🚀 Starting optimized product loading process...');
        
        // Check Redis memory first
        await checkRedisMemory();
        
        // Get command line arguments
        const csvFilePath = process.argv[2] || join(__dirname, '../services/products/data/bigbasket-products.csv');
        const batchSize = parseInt(process.argv[3]) || 100; // Increased since we're filtering out categories
        const maxProducts = parseInt(process.argv[4]) || 2000; // Increased limit since we have fewer products
        
        console.log(`📂 Loading from: ${csvFilePath}`);
        console.log(`⚙️  Batch size: ${batchSize}, Max products: ${maxProducts}`);
        console.log(`🚫 Excluding: Beauty & Hygiene, Cleaning & Household, Baby Care`);
        
        const result = await loadProductsFromCSV(csvFilePath, batchSize, maxProducts);
        
        console.log('✅ Product loading completed successfully!');
        console.log(`📊 Summary: ${result.productsLoaded} products, ${result.categories} categories, ${result.brands} brands`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to load products:', error);
        console.log('\n💡 Suggestions:');
        console.log('1. Increase Redis memory limit');
        console.log('2. Reduce batch size: npm run load-products <file> 50 1000');
        console.log('3. Use Redis with more memory or Redis Cloud');
        process.exit(1);
    }
}

main();