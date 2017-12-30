const setTimeoutPromise = function (time, ...args) {
    const data = {};
    data.wait = new Promise((resolve, reject) => {
        data.timeoutId = setTimeout(resolve, time, ...args);
        data.forceReject = reject;
    });
    return data;
};

const clearTimeoutPromise = function (timeoutObject) {
    clearTimeout(timeoutObject.timeoutId);
    timeoutObject.forceReject('Timeout cleared.');
};

module.exports.set = setTimeoutPromise;
module.exports.clear = clearTimeoutPromise;