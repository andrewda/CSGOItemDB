/**
 * This is the MySQL config script for http://github.com/andrewda/CSGOItemDB
 * It will create 3 tables, `prices`, `price_history`, and `keys`
 */

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/**
 * `prices` stores the current item prices
 */
 
CREATE TABLE IF NOT EXISTS `prices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item` text NOT NULL,
  `current_price` text NOT NULL,
  `avg_week_price` text NOT NULL,
  `avg_month_price` text NOT NULL,
  `lastupdate` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 ;

/**
 * `price_history` stores all prices within the last month (by default)
 */
 
CREATE TABLE IF NOT EXISTS `price_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item` text NOT NULL,
  `price` text NOT NULL,
  `time` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 ;

/**
 * `keys` stores the current API keys
 */
 
CREATE TABLE IF NOT EXISTS `keys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` text NOT NULL,
  `premium` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 ;
