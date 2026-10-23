import http from 'http';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import hbs from 'hbs';

import CONFIG from './config.ts';
import { handleError } from '#lib/errors';

import indexRouter from '#modules/index-routes';
// Module-based routes
import cartRouter from '#modules/cart/api/cart-routes';
import chatRouter from '#modules/chat/api/chat-routes';
import productApiRouter from '#modules/products/api/product-routes';
import productPagesRouter from '#modules/products/api/product-pages';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Handlebars partials and helpers. hbs names a partial after its file with dashes turned into underscores, so github-link.hbs is {{> github_link}}
hbs.registerPartials(path.join(__dirname, 'views/partials'));
hbs.registerHelper('eq', function (left, right) {
  return left === right;
});
hbs.registerHelper('repeat', function (this: unknown, count, options) {
  let result = '';
  for (let i = 0; i < count; i++) {
    result += options.fn(this);
  }
  return result;
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.locals.githubUrl = CONFIG.githubUrl; // Available in every view

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'client')));

// initialize routes
app.use('/', indexRouter);
app.use('/api/ai/chat', chatRouter); // Chat/AI routes
app.use('/api/cart', cartRouter); // Cart API routes
app.use('/api/products', productApiRouter); // Product API routes (JSON)
app.use('/products', productPagesRouter); // Product pages (HTML)

const server = http.createServer(app);

const port = Number(CONFIG.serverPort) || 3000;
app.set('port', port);

server.on('listening', function() {
	const addr = server.address();
	const bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr?.port;
	console.info('Listening on ' + bind);
});

server.listen(port);

// Use centralized error handler
app.use(handleError);

export default app;