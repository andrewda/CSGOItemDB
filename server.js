var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var mysql      = require('mysql');
var fs         = require('fs');

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
    database: options.mysql.database
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

router.get('/', function(req, res) {
    var query = res.req.query;
    
    if (query.key == undefined || query.item == undefined) {
        res.json({ success: false, error: options.errors.missing_params });
        return;
    }
    
    connection.query('SELECT * FROM `keys` WHERE `key`=\'' + query.key + '\'', function(err, row, fields) {
        if (err) throw err;
        
        if (row.length > 0) {
            connection.query('SELECT * FROM `prices` WHERE `item`=\'' + query.item + '\'', function(err, row, fields) {
                if (err) throw err;
                
                if (row.length > 0) {
                    res.json({ success: true, item: query.item, current_price: row[0].current_price, avg_week_price: row[0].avg_week_price, avg_month_price: row[0].avg_month_price, lastupdate: row[0].lastupdate });
                } else {
                    res.json({ success: false, error: options.errors.unknown_item });
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
