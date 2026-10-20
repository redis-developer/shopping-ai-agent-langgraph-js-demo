import { SCHEMA_FIELD_TYPE, SCHEMA_VECTOR_FIELD_ALGORITHM } from 'redis';

import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { getRedisClient } from '#modules/db/redis-client.js';

import { embed, embeddingDimensions } from '#modules/ai/providers/index.js';

/**
 * Create the consolidated search index with both text and vector fields
 * @param {boolean} dropExisting - Whether to drop the existing index first, e.g. after switching AI providers (the vector size changes)
 */
async function createProductIndex(dropExisting = false) {
    const client = await getRedisClient();

    try {
        if (dropExisting) {
            try {
                await client.ft.dropIndex('idx:products');
                console.log('✅ Dropped existing product index');
            } catch (error) {
                if (error.message.includes('Unknown index name')) {
                    console.log('ℹ️  No existing index to drop');
                } else {
                    console.log('⚠️  Error dropping index:', error.message);
                }
            }
        }

        await client.ft.create('idx:products', {
            '$.name': {
                type: SCHEMA_FIELD_TYPE.TEXT,
                SORTABLE: true,
                AS: 'name'
            },
            '$.description': {
                type: SCHEMA_FIELD_TYPE.TEXT,
                AS: 'description'
            },
            '$.category': {
                type: SCHEMA_FIELD_TYPE.TAG,
                AS: 'category'
            },
            '$.brand': {
                type: SCHEMA_FIELD_TYPE.TAG,
                AS: 'brand'
            },
            '$.salePrice': {
                type: SCHEMA_FIELD_TYPE.NUMERIC,
                AS: 'salePrice'
            },
            '$.marketPrice': {
                type: SCHEMA_FIELD_TYPE.NUMERIC,
                AS: 'marketPrice'
            },
            '$.rating': {
                type: SCHEMA_FIELD_TYPE.NUMERIC,
                AS: 'rating'
            },
            '$.productInfoEmbeddings': {
                type: SCHEMA_FIELD_TYPE.VECTOR,
                TYPE: 'FLOAT32',
                AS: 'embedding',
                ALGORITHM: SCHEMA_VECTOR_FIELD_ALGORITHM.HNSW,
                DISTANCE_METRIC: 'L2',
                DIM: embeddingDimensions,
            }
        }, {
            ON: 'JSON',
            PREFIX: 'products:'
        });
        console.log('✅ Search index created successfully');
    } catch (e) {
        if (e.message === 'Index already exists') {
            console.log('📋 Search index exists already, skipped creation.');
        } else {
            console.error('❌ Error creating search index:', e);
        }
    }
}

/**
 * Memory-optimized product loader that processes data in smaller batches
 * @param {string} csvFilePath - Path to the CSV file
 * @param {number} batchSize - Number of products to process at once (default: 50)
 * @param {number} maxProducts - Maximum number of products to load (default: 1000)
 * @param {boolean} dropExisting - Whether to drop the existing search index first (default: false)
 */
export async function loadProductsFromCSV(csvFilePath, batchSize = 50, maxProducts = 1000, dropExisting = false) {
    const client = await getRedisClient();
    await createProductIndex(dropExisting);

    try {
        console.log('📋 Reading CSV file:', csvFilePath);
        
        // Read and parse CSV file
        const csvData = readFileSync(csvFilePath, 'utf-8');
        const records = parse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log(`📦 Found ${records.length} total products in CSV`);

        // Categories to skip (non-grocery items)
        const EXCLUDED_CATEGORIES = [
            'Beauty & Hygiene',
            'Cleaning & Household', 
            'Baby Care'
        ];

        console.log(`🚫 Excluding categories: ${EXCLUDED_CATEGORIES.join(', ')}`);

        // Clean and process products (filter out excluded categories)
        const products = records
            .filter(record => {
                // Filter out empty products
                if (!record.product || !record.product.trim()) {
                    return false;
                }
                
                // Filter out excluded categories
                const category = record.category?.trim() || '';
                if (EXCLUDED_CATEGORIES.includes(category)) {
                    return false;
                }
                
                return true;
            })
            .slice(0, maxProducts) // Limit number of products
            .map(record => ({
                id: record.index || generateId(),
                name: record.product?.trim(),
                category: record.category?.trim() || 'Uncategorized',
                subCategory: record.sub_category?.trim() || '',
                brand: record.brand?.trim() || '',
                salePrice: parseFloat(record.sale_price) || 0,
                marketPrice: parseFloat(record.market_price) || 0,
                type: record.type?.trim() || '',
                rating: parseFloat(record.rating) || 0,
                description: record.description?.trim() || '',
                discount: record.market_price && record.sale_price ? 
                    Math.round(((parseFloat(record.market_price) - parseFloat(record.sale_price)) / parseFloat(record.market_price)) * 100) : 0,
                isOnSale: record.market_price && record.sale_price && parseFloat(record.market_price) > parseFloat(record.sale_price)
            }));

        console.log(`✅ Processing ${products.length} products in batches...`);

        // Clear existing data first (optional)
        console.log('🧹 Clearing existing product data...');
        const existingKeys = await client.keys('products:*');
        if (existingKeys.length > 0) {
            // Delete in chunks to avoid memory issues
            for (let i = 0; i < existingKeys.length; i += 1000) {
                const chunk = existingKeys.slice(i, i + 1000);
                await client.del(...chunk);
            }
        }

        // Process products in batches
        let totalProcessed = 0;
        const categories = new Set();
        const brands = new Set();
        
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            console.log(`📤 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(products.length/batchSize)} (${batch.length} items)`);
            
            // Generate embeddings for the batch
            const textsForEmbedding = batch.map(product => 
                `${product.name} ${product.brand} ${product.type} ${product.description.substring(0, 200)}`.replace(/\s+/g, ' ').trim()
            );
            
            const embeddings = await embed(textsForEmbedding);
            
            const pipeline = client.multi();
            
            for (let j = 0; j < batch.length; j++) {
                const product = batch[j];
                const embedding = embeddings[j];

                // Store product with embeddings
                const productData = {
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    subCategory: product.subCategory,
                    brand: product.brand,
                    salePrice: product.salePrice,
                    marketPrice: product.marketPrice,
                    type: product.type,
                    rating: product.rating,
                    description: product.description,
                    discount: product.discount,
                    isOnSale: product.isOnSale,
                    productInfoEmbeddings: embedding,
                };
                
                pipeline.json.set(`products:${product.id}`, '$', productData);
                
                categories.add(product.category);
                brands.add(product.brand);
            }
            
            try {
                await pipeline.exec();
                totalProcessed += batch.length;
                console.log(`✅ Batch completed. Total processed: ${totalProcessed}`);
                
                // Add small delay to prevent overwhelming Redis
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ Error processing batch starting at index ${i}:`, error);
                // Continue with next batch instead of failing completely
                continue;
            }
        }

        console.log('🎉 Products successfully loaded into Redis!');
        console.log(`📊 Final Statistics:`);
        console.log(`   - Products loaded: ${totalProcessed}`);
        console.log(`   - Categories: ${categories.size}`);
        console.log(`   - Brands: ${brands.size}`);
        
        return {
            success: true,
            productsLoaded: totalProcessed,
            categories: categories.size,
            brands: brands.size
        };

    } catch (error) {
        console.error('❌ Error loading products:', error);
        throw error;
    }
}

/**
 * Check Redis memory usage before loading
 */
export async function checkRedisMemory() {
    const client = await getRedisClient();
    try {
        const info = await client.info('memory');
        const lines = info.split('\r\n');
        const memoryInfo = {};
        
        lines.forEach(line => {
            const [key, value] = line.split(':');
            if (key && value) {
                memoryInfo[key] = value;
            }
        });
        
        console.log('🧠 Redis Memory Info:');
        console.log(`   Used Memory: ${memoryInfo.used_memory_human || 'Unknown'}`);
        console.log(`   Max Memory: ${memoryInfo.maxmemory_human || 'Unlimited'}`);
        
        return memoryInfo;
    } catch (error) {
        console.error('Error checking Redis memory:', error);
        return null;
    }
}

function generateId() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
