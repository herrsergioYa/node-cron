
async function until(until) {
    let currentTime = new Date();
    while (until > currentTime) {
        let interval = until.getTime() - currentTime.getTime();
        await sleep(interval/2.0);
        currentTime = new Date();
    }
}

function sleep(ms) {
    if(ms < 0) {
        return;
    }
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, ms);
    });
}

module.exports = {
    until,
    sleep,
};