'use strict';

const EventEmitter = require('events');
const TimeMatcher = require('./time-matcher');
const parser = require("cron-parser");
const convertExpression = require('./convert-expression');
const pause = require('./pause');

class Scheduler extends EventEmitter{
    constructor(pattern, timezone, autorecover){
        super();
        this.timeMatcher = new TimeMatcher(pattern, timezone);
        this.autorecover = autorecover;
        this.pattern = pattern;
        this.tz = timezone;
        this.hasSeconds = this.timeMatcher.pattern.split(' ')[0] !== '0';
        this.timeout = 0;
    }

    start(){
        // clear timeout if exists
        this.stop();

        let lastCheck = new Date();
        let timeout = this.timeout;

        let self = this;
        let inited = false;

        const matchTime = () => {
            let currentTime = new Date();
            if(inited) {
                if (lastCheck < currentTime) {
                    let executedAt = self.execute(lastCheck, currentTime);
                    if (this.autorecover || !executedAt) {
                        lastCheck = currentTime;
                    } else {
                        lastCheck = new Date();
                    }
                }
            } else {
                lastCheck = currentTime;
                inited = true;
            }
            const next = this.getExecutionMoments(lastCheck);
            if(next) {
                pause.until(next).then(function () {
                    if (self.timeout == timeout) {
                        matchTime();
                    }
                });
            }
        };
        matchTime();
    }

    stop(){
        this.timeout++;
    }

    execute(fromExclusive, toInclusive) {
        let lastExec = null;
        for(let tick of this.getExecutionMoments(fromExclusive, toInclusive)) {
            try {
                this.emit('scheduled-time-matched', tick);
                lastExec = tick;
            } catch (_) {
                continue;
            }
        }
        return lastExec;
    }

    getExecutionMoments(fromExclusive, toInclusive = null) {
        let result = [];
        if(toInclusive && fromExclusive > toInclusive) {
            return result;
        }
        if(parser) {

            let options = {
                currentDate: fromExclusive
            };

            if (toInclusive) {
                options.endDate = new Date(toInclusive.getTime() + 1);
            }

            if(this.tz) {
                options.tz = this.tz;
            }

            let cron = parser.parseExpression(this.pattern, options);

            while (cron.hasNext()) {
                let tick = cron.next().toDate();
                if (tick <= fromExclusive) {
                    continue;
                }
                if (!toInclusive) {
                    return tick;
                }
                if (tick > toInclusive) {
                    break;
                }
                result.push(tick);
                if (!this.autorecover) {
                    break;
                }
            }
        } else {
            let tick = new Date(fromExclusive.getTime() + 1);
            if(this.hasSeconds) {
                if (tick.getMilliseconds() > 0) {
                    tick.setSeconds(tick.getSeconds() + 1, 0);
                }
                for (; !toInclusive || tick <= toInclusive; tick.setSeconds(tick.getSeconds() + 1, 0)) {
                    if (this.timeMatcher.match(tick)) {
                        if (!toInclusive) {
                            return tick;
                        }
                        result.push(tick);
                        if (!this.autorecover) {
                            break;
                        }
                    }
                }
            } else {
                if (tick.getMilliseconds() + tick.getSeconds() > 0) {
                    tick.setMinutes(tick.getMinutes() + 1, 0, 0);
                }
                for (; !toInclusive || tick <= toInclusive; tick.setMinutes(tick.getMinutes() + 1, 0,  0)) {
                    if (this.timeMatcher.match(tick)) {
                        if (!toInclusive) {
                            return tick;
                        }
                        result.push(tick);
                        if (!this.autorecover) {
                            break;
                        }
                    }
                }
            }
        }
        if (!toInclusive) {
            return null;
        }
        return result;
    }
}

module.exports = Scheduler;
