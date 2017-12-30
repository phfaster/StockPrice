const Koa = require('koa');
const Router = require('koa-router');
const bodyparser = require('koa-bodyparser');

const app = new Koa();
app.use(bodyparser());
const router = new Router({prefix: '/api'});

const CoverDB = require('./CoverDB');
const db = new CoverDB(__dirname+'/../stockPrices.sqlite');

const StocksWatcher = require('./StocksWatcher');
const stocksWatcher = new StocksWatcher(db);

const stocksCountOnPage = 9;

async function getPositionOfStock(symbol) {
    const r = await db.stockPosition(symbol);
    const totalPosition = r.position - 1;
    const page = (totalPosition / stocksCountOnPage) ^ 0;
    return {page, position: (totalPosition % stocksCountOnPage)};
}

router.post('/addStock', async ctx => {
    let symbol = ctx.request.body.symbol;
    symbol = symbol ? symbol.trim() : symbol;
    if(!symbol) {
        ctx.body = {error: 'Invalid Stock Price symbol!'};
        return;
    }

    symbol = symbol.toUpperCase();

    let exists = await db.stockExists(symbol);

    if(exists) {
        ctx.body = {exists: await getPositionOfStock(symbol)};
        return;
    }

    let stockExists = await stocksWatcher.stockExists(symbol);

    if(!stockExists) {
        ctx.body = {error: 'Invalid Stock Price symbol!'};
        return;
    }

    let prices;
    try {
        prices = await stocksWatcher.getPrices(symbol);
    }
    catch(err) {
        console.log(err);
        let sendErr = false;
        if (symbol.startsWith('^')) {
            try {
                prices = await stocksWatcher.getPrices(symbol = symbol.slice(1));
            }
            catch(err) {
                console.log(symbol, 'also not found.');
                sendErr = true;
            }
        }
        else {
            sendErr = true;
        }

        if(sendErr) {
            ctx.body = {error: 'Most likely the wrong ticker symbol. Unexpected error.'};
            return;
        }
    }

    if(!(await db.insertStock(symbol, prices))) {
        ctx.body = {error: 'Internal server error (db)!'};
        return;
    }

    ctx.type = 'application/json';
    ctx.body = {
        res: {
            title: symbol,
            lastPrice: prices[prices.length-1]
        },

        position: await getPositionOfStock(symbol),

        frequency: stocksWatcher.frequency
    };
});

router.get('/getStock', async ctx => {
    let symbol = ctx.query.symbol;
    symbol = symbol ? symbol.trim() : symbol;
    if(!symbol) {
        ctx.body = {error: 'Invalid Stock Price symbol!'};
        return;
    }

    let stock = await db.getStock(symbol);

    if(stock) {
        stock.prices = JSON.parse(stock.prices);
    }

    ctx.type = 'application/json';
    ctx.body = {
        res: stock
    };
});

router.get('/getStocks', async ctx => {
    const { page=0 } = ctx.request.query;

    let stocks, total;

    try {
        stocks = await db.getStocks(page * stocksCountOnPage, stocksCountOnPage);
        total = (await db.totalStocks()).total;
    }
    catch(err) {
        console.log('ERROR IN DB:', err);
        ctx.body = {error: 'Internal Server Error (db)!'};
        return;
    }

    if (stocks) {
        for (let stock of stocks) {
            stock.lastPrice = JSON.parse(stock.lastPrice);
        }
    }

    ctx.type = 'application/json';
    ctx.body = {
        res: stocks,
        total: {pages: Math.min(5, Math.ceil(total / stocksCountOnPage)), stocks: total}
    };
});

router.get('/getPrice', async ctx => {
    ctx.type = 'application/json';

    let {symbols} = ctx.query;
    symbols = symbols ? symbols.trim() : symbols;
    if(!symbols) {
        ctx.body = {error: 'Invalid Stock Price symbol!'};
        return;
    }

    symbols = symbols.split(',');

    const exists = await db.stocksExists(symbols);

    if (exists === null || exists.length < symbols.length) {
        ctx.body = {stocksDeleted: true};
        return;
    }

    let response;

    try {
        response = await stocksWatcher.getStocksPrice(symbols);
    }
    catch(err) {
        console.log('Error in get stocks price', err);
        ctx.body = {error: 'Internal server error!'};
        return;
    }

    const res = response.res;
    for (let k = 0; k < res.length; k++) {
        const prices = res[k];
        if (!prices || prices.error) {
            continue;
        }

        const lastPrice = prices[prices.length - 1];

        if(lastPrice.price && !(await db.updateStock(symbols[k], prices))) {
            res[k] = {error: 'Internal server error (db)!'};
        } else {
            res[k] = lastPrice;
        }
    }

    ctx.body = response;
});

router.get('/getPrices', async ctx => {
    ctx.type = 'application/json';

    let {symbol} = ctx.query;
    symbol = symbol ? symbol.trim() : symbol;
    if(!symbol) {
        ctx.body = {error: 'Invalid Stock Price symbol!'};
        return;
    }

    let prices = await stocksWatcher.getPrices(symbol);

    if(prices) {
        if (prices.error) {
            ctx.body = prices;
            return;
        } else if (!prices[prices.length - 1].price) {
            ctx.body = {
                res: undefined,

                timeout: await stocksWatcher.getRequestRemainingTime(symbol)
            };
            return;
        }
    } else if(!prices) {
        ctx.body = {error: 'Invalid Stock Price symbol!'};
        return;
    }

    if(!(await db.updateStock(symbol, prices))) {
        ctx.body = {error: 'Internal server error (db)!'};
        return;
    }

    ctx.body = {
        res: prices,

        timeout: await stocksWatcher.getRequestRemainingTime(symbol)
    };
});

router.get('/deleteStock', async ctx => {
    ctx.type = 'application/json';

    let {symbol} = ctx.query;
    symbol = symbol ? symbol.trim() : symbol;
    if(!symbol) {
        ctx.body = {error: 'Invalid Stock Price symbol!'};
        return;
    }

    const result = await db.deleteStock(symbol);

    delete stocksWatcher.lastUpdates[symbol];

    ctx.body = {
        res: result
    }
});

app
    .use(router.routes())
    .use(router.allowedMethods());

db.open()
    /* Start server */
    .then(() => {
        app.listen(3000);
        console.log('Server start on port 3000.');
    })
    .catch(e => console.error('INIT ERROR:', e));