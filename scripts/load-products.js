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

        // Parse command line arguments
        const args = process.argv.slice(2);
        const dropExisting = args.includes('--drop') || args.includes('--fresh');

        // Filter out flags to get positional arguments
        const positionalArgs = args.filter(arg => !arg.startsWith('--'));

        const csvFilePath = positionalArgs[0] || join(__dirname, '../services/products/data/bigbasket-products.csv');
        const batchSize = parseInt(positionalArgs[1]) || 100; // Increased since we're filtering out categories
        const maxProducts = parseInt(positionalArgs[2]) || 2000; // Increased limit since we have fewer products

        console.log(`📂 Loading from: ${csvFilePath}`);
        console.log(`⚙️  Batch size: ${batchSize}, Max products: ${maxProducts}`);
        console.log(`🗑️  Drop existing: ${dropExisting ? 'YES' : 'NO'}`);

        if (dropExisting) {
            console.log('⚠️  WARNING: This will delete all existing product data and recreate the index!');
        }

        const result = await loadProductsFromCSV(csvFilePath, batchSize, maxProducts, dropExisting);
        
        console.log('✅ Product loading completed successfully!');
        console.log(`📊 Summary: ${result.productsLoaded} products, ${result.categories} categories, ${result.brands} brands`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to load products:', error);
        console.log('\n💡 Usage:');
        console.log('   npm run load-products [csvFile] [batchSize] [maxProducts] [--drop]');
        console.log('   npm run load-products --drop                    # Fresh start with defaults');
        console.log('   npm run load-products products.csv 50 1000     # Custom parameters');
        console.log('   npm run load-products --drop products.csv      # Fresh start with custom file');
        console.log('\n💡 Troubleshooting:');
        console.log('1. Increase Redis memory limit');
        console.log('2. Reduce batch size: npm run load-products <file> 50 1000');
        console.log('3. Use Redis with more memory or Redis Cloud');
        console.log('4. Use --drop flag to start fresh if index is corrupted');
        process.exit(1);
    }
}

main();