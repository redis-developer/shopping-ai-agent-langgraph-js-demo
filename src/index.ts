import http from 'http';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { create } from 'express-handlebars';

import CONFIG from './config.ts';
import { handleError } from './lib/errors.ts';

import indexRouter from './modules/index-routes.ts';
// Module-based routes
import cartRouter from './modules/cart/api/cart-routes.ts';
import chatRouter from './modules/chat/api/chat-routes.ts';
import productApiRouter from './modules/products/api/product-routes.ts';
import productPagesRouter from './modules/products/api/product-pages.ts';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Create Handlebars instance with helpers
const hbs = create({
  extname: '.hbs',
  defaultLayout: false, // Disable default layout
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    eq: function (a, b) {
      return a === b;
    },
    repeat: function (count, options) {
      let result = '';
      for (let i = 0; i < count; i++) {
        result += options.fn(this);
      }
      return result;
    }
  }
});

// view engine setup
app.engine('.hbs', hbs.engine);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', '.hbs');
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