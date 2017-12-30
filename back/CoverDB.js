const sqlite = require('sqlite3').verbose();

class CoverDB {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = undefined;
    }

    async open() {
        this.db = new sqlite.Database(this.dbPath);

        return this.run(`
        CREATE TABLE IF NOT EXISTS 'stockPrices' (
            'title' TEXT NOT NULL PRIMARY KEY UNIQUE,
            'lastPrice' TEXT NOT NULL,
            'prices' TEXT NOT NULL
        )
        `);
    }

    async stockExists(title) {
        return !!(await this.get('SELECT title FROM stockPrices WHERE title=? LIMIT 1', title));
    }

    stocksExists(symbols) {
        let insertions = '';
        for (const symbol of symbols) {
            insertions += '?, ';
        }
        insertions = insertions.slice(0, -2);
        return this.get(`SELECT COUNT(title) as length FROM stockPrices WHERE title IN (${insertions}) LIMIT 1`, ...symbols);
    }

    stockPosition(title) {
        return this.get('SELECT COUNT(title) as position FROM stockPrices WHERE title<=? ORDER BY title', title);
    }

    getStock(symbol) {
        return this.get('SELECT title, prices FROM stockPrices WHERE title=? LIMIT 1', symbol);
    }

    getStocks(offset, pageLength) {
        return this.all('SELECT title, lastPrice FROM stockPrices ORDER BY title LIMIT ?, ?', offset, pageLength);
    }

    totalStocks() {
        return this.get('SELECT COUNT(title) as total FROM stockPrices ORDER BY title');
    }

    deleteStock(symbol) {
        return this.delete('DELETE FROM stockPrices WHERE title=?', symbol);
    }

    updateStock(title, prices) {
        return this.update(
            'UPDATE stockPrices SET lastPrice=?, prices=? WHERE title=?',
            JSON.stringify(prices[prices.length-1]),
            JSON.stringify(prices),
            title
        );
    }

    insertStock(title, prices) {
        return this.insert(
            'INSERT INTO stockPrices (title, lastPrice, prices) VALUES (?, ?, ?)',
            title,
            JSON.stringify(prices[prices.length-1]),
            JSON.stringify(prices)
        )
    }


    async _request(method, args) {
        return new Promise((resolve, reject) => {
            this.db[method](...args, function (err, data) {
                if(err !== null) {
                    console.error('DB Error:', err);
                    console.log('SQL Query:', args[0]);
                    resolve(false);
                    return;
                }
                if(method === 'run') {
                    resolve(this);
                }
                else if(method === 'get') {
                    resolve((data === undefined) ? null : data);
                }
                else if(method === 'all') {
                    resolve(data ? (data.length ? data : null) : false)
                }
            });
        });
    }

    all(...args) {
        return this._request('all', args);
    }

    get(...args) {
        return this._request('get', args);
    }

    run(...args) {
        return this._request('run', args);
    }

    async insert(...args) {
        const r = await this._request('run', args);
        return r.lastID !== 0;
    }

    async update(...args) {
        const r = await this._request('run', args);
        return r.changes !== 0;
    }

    async delete(...args) {
        const r = await this._request('run', args);
        return r.changes !== 0;
    }
}

module.exports = CoverDB;
