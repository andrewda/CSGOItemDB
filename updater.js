var request = require('request');
var mysql   = require('mysql');
var fs      = require('fs');

var options = {};

try {
    options = JSON.parse(fs.readFileSync('options.json'));
} catch (err) {
    throw err;
}

var db_config = {
    host: options.mysql.host,
    user: options.mysql.user,
    port: options.mysql.port,
    password: options.mysql.password,
    database: options.mysql.database,
    charset: 'latin1_swedish_ci'
};

var connection;

function initSQL() {
    connection = mysql.createConnection(db_config);

    connection.connect(function(err) {
        if (err) {
            setTimeout(initSQL, 2000);
        } else {
            console.log('Connected to MySQL.');
        }
    });

    connection.on('error', function(err) {
        console.log('MySQL error: ' + err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            initSQL();
        } else {
            throw err;
        }
    });
}

initSQL();

setTimeout(refreshPrices, 1000);

function refreshPrices() {
    var current = Math.floor(Date.now() / 1000);
    connection.query('SELECT * FROM `prices` WHERE `lastupdate`<' + (parseInt(current) - options.update_time).toString(), function(err, row) {
        if (err) {
            throw err;
        }
        
        if (row.length > 0) {
            var time = Math.floor(Date.now() / 1000);
            row.forEach(function(item) {
                connection.query('UPDATE `prices` SET `lastupdate`=' + current + ' WHERE `item`=\'' + item.item + '\'');
                request('http://steamcommunity.com/market/priceoverview/?country=US&currency=1&appid=730&market_hash_name=' + encodeURIComponent(item.item), function (error, response, body) {
                    var json = JSON.parse(body);
                    if (!error && response.statusCode === 200 && json.lowest_price !== undefined) {
                        time = Math.floor(Date.now() / 1000);
                        connection.query('UPDATE `prices` SET `current_price`=\'' + parseFloat(json.lowest_price.replace('$', '')).toString() + '\' WHERE `item`=\'' + item.item + '\'');
                        connection.query('INSERT INTO `price_history` (`item`, `price`, `time`) VALUES (\'' + item.item + '\', \'' + parseFloat(json.lowest_price.replace('$', '')).toString() + '\', ' + time.toString() + ')');
                        console.log('Succesfully updated ' + item.item + ' w/ ' + json.lowest_price);
                    } else {
                        console.log('An error occured receiving price for item: ' + item.item);
                    }
                });
                
                setTimeout(function() {
                    time = Math.floor(Date.now() / 1000);
                    
                    //get weekly price
                    connection.query('SELECT * FROM `price_history` WHERE `item`=\'' + item.item + '\' AND `time`>' + (time - 604800).toString(), function(err, row) {
                        if (err) {
                            throw err;
                        }
                        
                        var total = 0;
                        var num = 0;
                        
                        row.forEach(function(item) {
                            total += parseFloat(item.price);
                            num++;
                        });
                        
                        if (!isNaN(total/num) && num != 0) {
                            connection.query('UPDATE `prices` SET `avg_week_price`=\'' + (total/num).toFixed(2).toString() + '\' WHERE `item`=\'' + item.item + '\'');
                        }
                    });
                    
                    //get monthly price
                    connection.query('SELECT * FROM `price_history` WHERE `item`=\'' + item.item + '\' AND `time`>' + (time - 2592000).toString(), function(err, row) {
                        if (err) {
                            throw err;
                        }
                        
                        var total = 0;
                        var num = 0;
                        
                        row.forEach(function(item) {
                            total += parseFloat(item.price);
                            num++;
                        });
                        
                        if (!isNaN(total/num) && num != 0) {
                            connection.query('UPDATE `prices` SET `avg_month_price`=\'' + (total/num).toFixed(2).toString() + '\' WHERE `item`=\'' + item.item + '\'');
                        }
                    });
                }, 10000);
            });
        }
    });
}

setInterval(refreshPrices, options.refresh_interval);
