/**
 * --------------------------------------------------------------------------
 * Merchant Center Disapproval Alerter — Google Ads Script
 * --------------------------------------------------------------------------
 * Detects products that may have been disapproved by identifying items that
 * stopped receiving impressions. Compares recent vs prior period.
 *
 * LIMITATION: Uses impression loss as a proxy. Direct disapproval status
 * requires Merchant Center UI or Content API.
 *
 * Author:  Thibault Fayol — Thibault Fayol Consulting
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  EMAIL: "you@domain.com",
  RECENT_RANGE: "LAST_7_DAYS",
  PRIOR_RANGE: "LAST_30_DAYS",
  MIN_PRIOR_IMPRESSIONS: 10,
  SHEET_URL: ""
};

function main() {
  try {
    Logger.log("=== Merchant Center Disapproval Alerter ===");
    Logger.log("Mode: " + (CONFIG.TEST_MODE ? "TEST (dry run)" : "LIVE"));

    // Step 1: Products active in prior period
    Logger.log("Step 1: Querying prior period (" + CONFIG.PRIOR_RANGE + ")...");
    var priorQuery =
      "SELECT segments.product_item_id, segments.product_title, segments.product_type_l1, " +
      "campaign.name, metrics.impressions, metrics.clicks " +
      "FROM shopping_performance_view " +
      "WHERE segments.date DURING " + CONFIG.PRIOR_RANGE + " " +
      "AND metrics.impressions >= " + CONFIG.MIN_PRIOR_IMPRESSIONS;

    var priorRows = AdsApp.search(priorQuery);
    var priorProducts = {};

    while (priorRows.hasNext()) {
      var row = priorRows.next();
      var id = row.segments.productItemId || "";
      if (id) {
        priorProducts[id] = {
          id: id,
          title: row.segments.productTitle || "(no title)",
          type: row.segments.productTypeL1 || "(no type)",
          campaign: row.campaign.name || "(unknown)",
          priorImpressions: row.metrics.impressions,
          priorClicks: row.metrics.clicks
        };
      }
    }

    Logger.log("Products active in prior period: " + Object.keys(priorProducts).length);

    // Step 2: Products active in recent period
    Logger.log("Step 2: Querying recent period (" + CONFIG.RECENT_RANGE + ")...");
    var recentQuery =
      "SELECT segments.product_item_id, metrics.impressions " +
      "FROM shopping_performance_view " +
      "WHERE segments.date DURING " + CONFIG.RECENT_RANGE + " " +
      "AND metrics.impressions > 0";

    var recentRows = AdsApp.search(recentQuery);
    var recentActive = {};

    while (recentRows.hasNext()) {
      var recentRow = recentRows.next();
      var recentId = recentRow.segments.productItemId || "";
      if (recentId) {
        recentActive[recentId] = true;
      }
    }

    Logger.log("Products active in recent period: " + Object.keys(recentActive).length);

    // Step 3: Find missing products
    var suspected = [];
    var ids = Object.keys(priorProducts);
    for (var i = 0; i < ids.length; i++) {
      if (!recentActive[ids[i]]) {
        suspected.push(priorProducts[ids[i]]);
      }
    }

    suspected.sort(function(a, b) { return b.priorImpressions - a.priorImpressions; });
    Logger.log("Suspected disapproved: " + suspected.length);

    var logLimit = Math.min(suspected.length, 25);
    for (var j = 0; j < logLimit; j++) {
      var p = suspected[j];
      Logger.log("  SUSPECTED: " + p.id + " | " + p.title + " | Prior impr: " + p.priorImpressions);
    }

    if (!CONFIG.TEST_MODE && CONFIG.SHEET_URL && suspected.length > 0) {
      writeToSheet(suspected);
    }

    if (suspected.length > 0) {
      sendAlert(suspected);
    } else {
      Logger.log("No suspected disapprovals detected.");
    }

    Logger.log("=== Done ===");

  } catch (e) {
    Logger.log("ERROR: " + e.message);
    MailApp.sendEmail(CONFIG.EMAIL, "MC Disapproval Alerter — Script Error",
      "Error:\n\n" + e.message + "\n\nStack: " + e.stack);
  }
}

function writeToSheet(products) {
  var sheet = SpreadsheetApp.openByUrl(CONFIG.SHEET_URL).getActiveSheet();
  sheet.clearContents();

  var data = [["Product ID", "Title", "Product Type", "Campaign", "Prior Impressions", "Prior Clicks", "Status"]];
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    data.push([p.id, p.title, p.type, p.campaign, p.priorImpressions, p.priorClicks, "Suspected Disapproved"]);
  }

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  Logger.log("Sheet updated with " + products.length + " suspected disapprovals.");
}

function sendAlert(products) {
  var account = AdsApp.currentAccount().getName();
  var subject = "MC Disapproval Alert: " + products.length + " products suspected — " + account;

  var body = "Merchant Center Disapproval Alerter\n";
  body += "Account: " + account + "\n";
  body += "Recent period: " + CONFIG.RECENT_RANGE + "\n";
  body += "Prior period: " + CONFIG.PRIOR_RANGE + "\n";
  body += "Suspected disapprovals: " + products.length + "\n\n";
  body += "IMPORTANT: These products had impressions previously but receive none now.\n";
  body += "This MAY indicate disapproval, but could also be budget, pausing, or seasonal.\n";
  body += "Verify in Google Merchant Center for actual status.\n\n";
  body += "Suspected disapproved products:\n";
  body += "-------------------------------------------\n";

  var limit = Math.min(products.length, 40);
  for (var i = 0; i < limit; i++) {
    var p = products[i];
    body += (i + 1) + ". " + p.title + "\n";
    body += "   ID: " + p.id + " | Type: " + p.type + " | Prior impr: " + p.priorImpressions + "\n";
  }

  if (products.length > limit) {
    body += "\n... and " + (products.length - limit) + " more.\n";
  }

  body += "\nAction: Check these products in Google Merchant Center.\n";

  MailApp.sendEmail(CONFIG.EMAIL, subject, body);
  Logger.log("Alert email sent to " + CONFIG.EMAIL);
}
