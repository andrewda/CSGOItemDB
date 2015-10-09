var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mysql = require('mysql');
var request = require('request');
var fs = require('fs');

var options = {};

try {
    options = JSON.parse(fs.readFileSync('options.json'));
} catch (err) {
    throw err;
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;
var router = express.Router();

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
    
    setInterval(function() {
        connection.query('SELECT 1');
    }, 5000);
}

initSQL();

router.get('/', function(req, res) {
    var query = res.req.query;
    
    if (query.key === undefined || query.item === undefined) {
        res.json({ success: false, error: options.errors.missing_params });
        return;
    }
    
    connection.query('SELECT `premium` FROM `keys` WHERE `key`=\'' + query.key + '\'', function(err, row) {
        if (err) {
            throw err;
        }
        
        if (row.length > 0) {
            connection.query('SELECT `item`,`current_price`,`avg_week_price`,`avg_month_price`,`lastupdate` FROM `prices` WHERE `item`=\'' + query.item + '\'', function(err, row) {
                if (err) {
                    throw err;
                }
                
                if (row.length > 0) {
                    var current_price, avg_week_price, avg_month_price;
                
                    if (row[0].current_price !== undefined && row[0].avg_week_price !== undefined && row[0].avg_month_price !== undefined) {
                        current_price = row[0].current_price;
                        avg_week_price = row[0].avg_week_price;
                        avg_month_price = row[0].avg_month_price;
                    }
                    
                    if (current_price !== undefined && avg_week_price !== undefined && avg_month_price !== undefined) {
                        res.json({ success: true, current_price: current_price, avg_week_price: avg_week_price, avg_month_price: avg_month_price, lastupdate: row[0].lastupdate });
                    }
                } else {
                    request('http://steamcommunity.com/market/priceoverview/?country=US&currency=1&appid=730&market_hash_name=' + encodeURIComponent(query.item), function(error, response, body) {
                        var json = '';
                        
                        try {
                            json = JSON.parse(body);
                        } catch (e) {
                            res.json({ success: false, error: options.errors.unknown_item });
                            return;
                        }
                        
                        var current = Math.floor(Date.now() / 1000);
                        if (!error && response.statusCode === 200 && json.lowest_price !== undefined && json.median_price !== undefined) {
                            connection.query('INSERT INTO `prices` (`item`, `current_price`, `avg_month_price`, `avg_week_price`, `lastupdate`) VALUES (\'' + query.item + '\', \'' + json.lowest_price.replace('$', '') + '\', \'' + json.median_price.replace('$', '') + '\', \'' + json.median_price.replace('$', '') + '\', ' + current + ')');
                            connection.query('INSERT INTO `price_history` (`item`, `price`, `time`) VALUES (\'' + query.item + '\', \'' + json.median_price.replace('$', '') + '\', ' + current + ')');
                            
                            connection.query('SELECT `item`,`current_price`,`avg_week_price`,`avg_month_price`,`lastupdate` FROM `prices` WHERE `item`=\'' + query.item + '\'', function(err, row) {
                                if (err) {
                                    throw err;
                                }
                                
                                if (row.length > 0) {
                                    res.json({ success: true, current_price: row[0].current_price, avg_week_price: row[0].avg_week_price, avg_month_price: row[0].avg_month_price, lastupdate: row[0].lastupdate });
                                } else {
                                    res.json({ success: false, error: options.errors.unknown_item });
                                }
                            });
                        } else {
                            res.json({ success: false, error: options.errors.unknown_item });
                        }
                    });
                }
            });
        } else {
            res.json({ success: false, error: options.errors.invalid_key });
        }
    });
});

// REGISTER OUR ROUTE
app.use('/api', router);

// START THE SERVER
app.listen(port);
console.log('Magic happens on port ' + port);
