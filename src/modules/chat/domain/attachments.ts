import type { ProductSummary } from '#modules/products/domain/product-service';

/** Content that comes with a reply for the UI to render. It is mostly structured data, such as product summaries (the type says what is in data), though it could also be HTML. */
export type Attachment = { type: 'productSummary'; data: ProductSummary };
