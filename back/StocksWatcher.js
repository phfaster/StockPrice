const request = require('./retryRequest');
const moment = require('moment-timezone');
const timeoutPromise = require('./timeoutPromise');

const API_KEY = 'DAX5IHYCE2KKWTVS';

class StocksWatcher {
    constructor(db) {
        this.db = db;
        this.url = 'https://www.alphavantage.co/query';

        this.listenersCount = 0;
        this.frequencyMiltiplier = 1;
        this.frequencyResetTime = 30000;
        this.defaultFrequency = 60000;
        this.frequency = this.defaultFrequency;
        this.lastRequest = Promise.resolve();
        this.lastUpdates = {};
    }

    getRequestRemainingTime(symbol, fromTime = (new Date).getTime()) {
        const lastUpdate = this.lastUpdates[symbol];

        if (!lastUpdate || !lastUpdate.requestTime || !lastUpdate.request) {
            return 0;
        }

        return this.frequency - (fromTime - lastUpdate.requestTime);
    }

    stockExists(symbol) {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                url: symbol,
                baseUrl: 'https://finance.yahoo.com/quote/',
                callback(err, response) {
                    if(err) return;
                    let isQuote =
                        response.request &&
                        response.request.uri &&
                        response.request.uri.pathname.startsWith('/quote');
                    if(isQuote) {
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                }
            }).wait
                .catch(reject);
        });
    }

    getStocksPrice(symbols) {
        return new Promise(resolve => {
            const symbolsCount = symbols.length;
            const response = new Array(symbolsCount);
            let countResolved = 0;

            let sent = false;

            const longPollFrequency = 15000;

            const sendResponse = () => {
                sent = true;

                const responseObj = {res: response};

                const nowDate = (new Date).getTime();

                let minRemainingTime = 60000;

                let k = 0;
                for (const symbol of symbols) {
                    let remainingTime;

                    const res = response[k];

                    if (!res || res.error) {
                        remainingTime = 0;
                    } else {
                        remainingTime = this.getRequestRemainingTime(symbol, nowDate);
                        if (remainingTime < 0) {
                            remainingTime = 0;
                        }

                        res[res.length - 1].timeout = remainingTime;
                    }

                    if (remainingTime < minRemainingTime) {
                        minRemainingTime = remainingTime;
                    }

                    k++;
                }

                responseObj.timeout = minRemainingTime < 0 ? 0 : minRemainingTime;

                resolve(responseObj);
            };

            const responseTimeout = setTimeout(sendResponse, longPollFrequency);

            const getPrices = (symbol, i) => {
                this.getPrices(symbol)
                    .then(result => {
                        if (sent) {
                            return;
                        }
                        response[i] = result;

                        countResolved++;
                        if (countResolved === symbolsCount) {
                            clearTimeout(responseTimeout);
                            sendResponse();
                        }
                    });
            };

            let i = 0;
            for (const symbol of symbols) {
                getPrices(symbol, i);

                i++;
            }
        });
    }

    getPrices(symbol) {
        let lastUpdate = this.lastUpdates[symbol] || (this.lastUpdates[symbol] = {});

        const requestRemaining = this.getRequestRemainingTime(symbol);

        if (requestRemaining <= 0) {
            return lastUpdate.request = this.request(symbol, lastUpdate)
                .catch(err => {
                    console.log('Error in get prices for', symbol+':', err);
                    return {error: 'Unexpected error in get price request (' + symbol + ').'};
                });
        } else {
            return lastUpdate.request;
        }
    }

    balanceFrequency() {
        let listenersCount = this.listenersCount;
        let multiplier = ((listenersCount / 54) ^ 0) + 1;

        if (multiplier !== this.frequencyMiltiplier) {
            this.frequencyMiltiplier = multiplier;
            this.frequency = this.defaultFrequency * multiplier;
        }
    }

    async setFrequency(symbol, lastUpdate) {
        const frequencyReset = lastUpdate.frequencyReset;
        if (frequencyReset) {
            clearTimeout(frequencyReset);
        }
        else {
            this.balanceFrequency();

            this.listenersCount++;
        }

        lastUpdate.frequencyReset = setTimeout(() => {
            delete this.lastUpdates[symbol];

            this.listenersCount--;

            this.balanceFrequency();
        }, this.frequencyResetTime + this.frequency);
    }

    async sendGetPricesRequest(interval, symbol) {
        const requestData = request.get({
            url: this.url,
            qs: {
                function: 'TIME_SERIES_INTRADAY',
                symbol,
                interval,
                apikey: API_KEY
            },
            json: true
        });

        return await requestData.wait;
    }

    async request(symbol, lastUpdate) {
        await this.setFrequency(symbol, lastUpdate);

        /* Sending request every second limit */
        await (this.lastRequest = this.lastRequest.then(() => timeoutPromise.set(1000).wait));

        lastUpdate.requestTime = new Date;

        const interval = '1min';

        let d = await this.sendGetPricesRequest(interval, symbol);

        let timeZone, values;

        timeZone = d["Meta Data"]["6. Time Zone"];
        values = d["Time Series (" + interval + ")"];

        let prices = [];
        let k = 0;
        for (let timestamp in values) {
            if (!values.hasOwnProperty(timestamp)) continue;
            if (k === 60) break;

            let price = {};
            for (let priceType in values[timestamp]) {
                if (!values[timestamp].hasOwnProperty(priceType)) continue;

                const priceTypeFull = priceType;
                priceType = priceTypeFull.replace(/^\d+\. /, '');
                priceType = priceType[0].toUpperCase() + priceType.slice(1);
                price[priceType] = parseFloat(values[timestamp][priceTypeFull])
            }

            prices.unshift({
                time: moment.tz(timestamp, timeZone).unix() * 1000,
                price
            });

            k++;
        }

        if (!prices.length) {
            lastUpdate.lastPrice = {time: 0, price: {Close: 0}};

            return [lastUpdate.lastPrice];
        }

        let prevData = lastUpdate.lastPrice;
        let newData = prices[prices.length-1];
        let [newPrice, prevPrice] = [newData.price.Close, undefined];
        if(prevData) {
            if (prevData.time === newData.time) {
                return [{}];
            }
            prevPrice = prevData.price.Close;
        } else if(prevPrice = prices[prices.length-2]) {
            prevPrice = prevPrice.price.Close;
        } else {
            prevPrice = 0;
        }

        newData.change = (newPrice > prevPrice) ? 1 : ((newPrice < prevPrice) ? -1 : 0);

        lastUpdate.lastPrice = newData;

        return prices;
    }
}

module.exports = StocksWatcher;