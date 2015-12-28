# CSGOItemDB.com
[![Codacy Badge](https://api.codacy.com/project/badge/3740b21ca3744edb80a376a9a0596ffa)](https://www.codacy.com/app/dassonville-andrew/CSGOItemDB-com)

CSGOItemDB is a simple API which allows users to get the prices of CS:GO skins.

## Setup

1. Clone the repository to your computer or download the files manually.

```
git clone https://github.com/andrewda/CSGOItemDB.com
```

2. Edit options.json

```JSON
{
    "mysql": {
        "host": "", - YOUR MYSQL HOST
        "user": "", - YOUR MYSQL USERNAME
        "port": 3306, - THE PORT TO YOUR MYSQL SERVER
        "password": "", - YOUR MYSQL PASSWORD
        "database": "" - THE DATABASE YOU WANT TO CONNECT TO
    },
    "errors": {
        "missing_params": "missing parameter(s)", - ERROR DISPLAYED FOR `missing_params`
        "invalid_key": "insufficient privileges (unrecognized key)", - ERROR DISPLAYED FOR `invalid_key`
        "not_premium": "insufficient privileges (not premium)", - ERROR DISPLAYED FOR `not_premium`
        "unknown_item": "unknown item" - ERROR DISPLAYED FOR `unknown_item`
    },
    "backpacktf_key": "", - YOUR BACKPACK.TF API KEY (can be retreived from http://backpack.tf/api)
    "update_time": 7200, - HOW OFTEN WE SHOULD UPDATE STORED PRICES (in seconds)
    "refresh_interval": 60000, - HOW OFTEN WE SHOULD CHECK FOR PRICES TO UPDATE (in milliseconds)
    "delete_old_interval": 90000 - HOW OFTEN WE SHOULD DELETE OLD PRICES
}
```

3. Configure your database with config.sql

4. Run the server

```
node server.json
```

5. Run the updater

```
node updater.js
```
