# Merchant Center Disapproval Alerter

A Google Ads Script that detects products potentially disapproved in Google Merchant Center by identifying items that suddenly lost all impressions.

## What It Does

- Compares product visibility between a recent period and a prior period
- Identifies products that had impressions before but now receive zero
- Exports suspected disapprovals to Google Sheets (optional)
- Sends an email alert listing all suspected disapproved products

## Important Limitation

This script detects products that stopped receiving impressions, which may indicate disapproval. However, impression loss can also result from budget exhaustion, paused campaigns, or seasonal changes.

For direct disapproval status, use the Google Merchant Center UI or the Content API for Shopping.

## Setup

1. In Google Ads, go to Tools > Bulk Actions > Scripts
2. Click + to create a new script
3. Paste the contents of main_en.gs (or main_fr.gs for French)
4. Update the CONFIG block with your settings
5. Authorize the script when prompted
6. Set TEST_MODE to false when ready to send alerts
7. Schedule to run daily for timely detection

## CONFIG Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| TEST_MODE | boolean | true | When true, logs only. When false, sends email alerts. |
| EMAIL | string | - | Email address for disapproval alerts. |
| RECENT_RANGE | string | LAST_7_DAYS | Recent period to check for zero impressions. |
| PRIOR_RANGE | string | LAST_30_DAYS | Prior period to confirm product was previously active. |
| MIN_PRIOR_IMPRESSIONS | number | 10 | Minimum prior impressions to consider a product as previously active. |
| SHEET_URL | string | empty | Optional Google Sheet URL for export. Leave empty to skip. |

## How It Works

1. Queries shopping_performance_view for the prior period to build a list of active products
2. Queries the recent period to identify which products still have impressions
3. Cross-references: products in the prior list but missing from the recent list are flagged
4. Sends an email alert sorted by prior impression volume

## Requirements

- Google Ads account with active Shopping campaigns
- Script authorization for email (and Sheets if using export)

## Languages

- main_en.gs - English
- main_fr.gs - French

## License

MIT - Thibault Fayol Consulting
