var request = require('request');
var mysql = require('mysql');
var fs = require('fs');

// define constants
var WEEK_SECONDS = 604800;
var MONTH_SECONDS = 2592000;

var connection;
var options = {};

// get the options from `options.json`
try {
    options = JSON.parse(fs.readFileSync('options.json'));
} catch (err) {
    throw err;
}

// if we have an environmental variable, use it
var mysqlHost = process.env.MYSQL_HOST || options.mysql.host;
var mysqlUser = process.env.MYSQL_USER || options.mysql.user;
var mysqlPort = process.env.MYSQL_PORT || options.mysql.port;
var mysqlPass = process.env.MYSQL_PASS || options.mysql.password;
var mysqlDB = process.env.MYSQL_DB || options.mysql.database;

var db_config = {
    host: mysqlHost,
    user: mysqlUser,
    port: mysqlPort,
    password: mysqlPass,
    database: mysqlDB,
    charset: 'latin1_swedish_ci'
};

function initSQL() {
    connection = mysql.createConnection(db_config);

    connection.connect(function(err) {
        // if there's an error, try again in 2 seconds
        if (err) {
            setTimeout(initSQL, 2000);
        } else {
            console.log('Connected to MySQL.');
        }
    });

    connection.on('error', function(err) {
        console.log('MySQL error: ' + err);
        
        // reconnect to mysql on `PROTOCOL_CONNECTION_LOST`
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            initSQL();
        } else {
            throw err;
        }
    });
    
    // keep the connection alive
    setInterval(function() {
        connection.query('SELECT 1');
    }, 5000);
}

// initiate mysql
initSQL();

////////////////////////////////////////////////////
// Update the prices of all items in the database //
////////////////////////////////////////////////////
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
                    var json = null;
                    
                    if (body.indexOf("success") > 0) {
                        json = JSON.parse(body);
                    }
                    
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
                    
                    // get weekly price
                    connection.query('SELECT * FROM `price_history` WHERE `item`=\'' + item.item + '\' AND `time`>' + (time - WEEK_SECONDS).toString(), function(err, row) {
                        if (err) {
                            throw err;
                        }
                        
                        var total = 0;
                        var num = 0;
                        
                        row.forEach(function(item) {
                            total += parseFloat(item.price);
                            num++;
                        });
                        
                        if (!isNaN(total/num) && num !== 0) {
                            connection.query('UPDATE `prices` SET `avg_week_price`=\'' + (total/num).toFixed(2).toString() + '\' WHERE `item`=\'' + item.item + '\'');
                        }
                    });
                    
                    // get monthly price
                    connection.query('SELECT * FROM `price_history` WHERE `item`=\'' + item.item + '\' AND `time`>' + (time - MONTH_SECONDS).toString(), function(err, row) {
                        if (err) {
                            throw err;
                        }
                        
                        var total = 0;
                        var num = 0;
                        
                        row.forEach(function(item) {
                            total += parseFloat(item.price);
                            num++;
                        });
                        
                        if (!isNaN(total/num) && num !== 0) {
                            connection.query('UPDATE `prices` SET `avg_month_price`=\'' + (total/num).toFixed(2).toString() + '\' WHERE `item`=\'' + item.item + '\'');
                        }
                    });
                }, 10000);
            });
        }
    });
}

///////////////////////////////////////////////////////////////
// Delete all rows from `price_history` older than one month //
///////////////////////////////////////////////////////////////
function deleteOld() {
    var time = Math.floor(Date.now() / 1000);
    
    connection.query('DELETE FROM `price_history` WHERE `time`<' + (time - MONTH_SECONDS).toString(), function (err) {
        if (err) {
            throw err;
        }
    });
}

setTimeout(refreshPrices, 1000);
setInterval(refreshPrices, options.refresh_interval);
setInterval(deleteOld, options.delete_old_interval);
