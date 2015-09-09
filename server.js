var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var mysql      = require('mysql');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;
var router = express.Router();

var db_config = {
    host: '',
    user: '',
    port: 3306,
    password: '',
    database: ''
};

var connection;

function initSQL() {
    connection = mysql.createConnection(db_config);

    connection.connect(function(err) {
        if (err) {
            console.log("Error when connecting to database: " + err);
            setTimeout(initSQL, 2000);
        } else {
            console.log("Connected to MySQL.");
        }
    });

    connection.on('error', function(err) {
        console.log('db error', err);
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
        res.json({ success: false, error: 'non-existant parameter(s)' });
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
                    res.json({ success: false, error: 'unknown item' });
                }
            });
        } else {
            res.json({ success: false, error: 'insufficient privileges' });
        }
    });
});

// REGISTER OUR ROUTE
app.use('/api', router);

// START THE SERVER
app.listen(port);
console.log('Magic happens on port ' + port);
