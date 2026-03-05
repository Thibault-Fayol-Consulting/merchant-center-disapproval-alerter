/**
 * merchant-center-disapproval-alerter - Google Ads Script for SMBs
 * Author: Thibault Fayol
 */
var CONFIG = { TEST_MODE: true, EMAIL: "..." };
function main(){
  var query = "SELECT shopping_performance_view.resource_name FROM shopping_performance_view";
  Logger.log("Querying Shopping API for disapproved items...");
}