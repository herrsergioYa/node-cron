const cron = require('.');

cron.schedule('*/30 * * * * *', function(now) {
   console.log(now + ' at ' + new Date());
});
