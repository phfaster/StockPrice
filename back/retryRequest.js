const request = require('request-promise-native');
const timeoutPromise = require('./timeoutPromise');
const { performance } = require('perf_hooks');

const REJECT_ERROR = new Error('Request force rejected!');

const retryRequest = function (reqo) {
    let THIS_DATA = {
        forceReject() {
            THIS_DATA.rejectFunction(true);
            const tt = THIS_DATA.tryThis;
            if(tt) tt.forceReject();
        }
    };

    THIS_DATA.wait = new Promise((resolve, reject) => {
        THIS_DATA.rejectFunction = reject;

        handleRequest(reqo)
            .then(resolve)
            .catch(err => {
                let tt = THIS_DATA.tryThis = tryThis(reqo);
                tt.wait
                    .then(resolve)
                    .catch(err => {
                        if(err === REJECT_ERROR) {
                            reject(onRejectError(err));
                            return;
                        }

                        reject(err);
                    });
            })
    });

    return THIS_DATA
};

retryRequest.post = (reqo) => {
    reqo.method = 'POST';
    return retryRequest(reqo);
};

retryRequest.get = (reqo) => {
    reqo.method = 'GET';
    return retryRequest(reqo);
};

async function handleRequest(reqo) {
    try {
        const r = await request(reqo);
        if(!r || ((typeof r) === 'object' && r['Error Message'])) {
            return handleError(reqo, new Error(r['Error Message']));
        }
        return r;
    }
    catch(err) {
        return handleError(reqo, err);
    }
}

function handleError(reqo, err) {
    if(err instanceof Error) {
        console.error('Error in Request:\n', err.message);
    }
    else {
        console.error('Error (another type) in Request:', err);
    }
    console.log('Request options:', reqo);
    return Promise.reject(err);
}

function tryThis(reqo, attempt=1, startMilliseconds=false) {
    const THIS_DATA = {
        forceReject() {
            THIS_DATA.rejectFunction(REJECT_ERROR);
            const tp = THIS_DATA.timeoutPromise;
            if(tp) timeoutPromise.clear(tp);
        }
    };
    THIS_DATA.data = THIS_DATA;
    THIS_DATA.wait = new Promise((resolve, reject) => {
        THIS_DATA.rejectFunction = reject;

        let time = 5 * attempt;
        console.log(`Reconnecting in ${time} seconds...`);
        if(!startMilliseconds) startMilliseconds = performance.now();
        let tp = THIS_DATA.timeoutPromise = timeoutPromise.set(time * 1000);
        tp.wait
            .then(() => {
                return handleRequest(reqo)
                    .then(r => {
                        let timeResultSeconds = ((performance.now() - startMilliseconds) / 1000).toFixed(2);
                        console.log(`Reconnected after ${timeResultSeconds} seconds!`);
                        return r;
                    })
                    .catch(err => {
                        if (attempt === 3) {
                            console.log("Can't reconnect; Attempts count:", attempt);
                            reject(err);
                            return;
                        }
                        console.log('Reconnecting failed!');
                        let tt = tryThis(reqo, ++attempt, startMilliseconds);
                        let td = THIS_DATA.data;
                        td.rejectFunction = tt.rejectFunction;
                        td.timeoutPromise = tt.timeoutPromise;
                        tt.data = td;
                        return tt.wait;
                    })
                    .then(d => resolve(d))
            })
            .catch(err => reject(err));
    });

    return THIS_DATA;
}

function onRejectError(err) {
    console.log(err.message);
    return true;
}

module.exports = retryRequest;
