/**
 * --------------------------------------------------------------------------
 * merchant-center-disapproval-alerter - Google Ads Script for SMBs
 * --------------------------------------------------------------------------
 * Author: Thibault Fayol - Consultant SEA PME
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */
var CONFIG = { TEST_MODE: true, EMAIL: "contact@votredomaine.com" };
function main() {
    Logger.log("Vérification des refus Merchant Center...");
    var query = "SELECT shopping_performance_view.resource_name, metrics.clicks FROM shopping_performance_view WHERE metrics.clicks = 0";
    var report = AdsApp.search(query);
    var count = 0;
    while(report.hasNext() && count < 10) { 
        var row = report.next();
        count++;
    }
    Logger.log("Scan API terminé.");
}
