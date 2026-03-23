/**
 * --------------------------------------------------------------------------
 * Merchant Center Disapproval Alerter — Script Google Ads
 * --------------------------------------------------------------------------
 * Detecte les produits potentiellement refuses en identifiant ceux qui ont
 * perdu toutes leurs impressions entre deux periodes.
 *
 * LIMITATION : Utilise la perte d'impressions comme indicateur. Le statut
 * reel de refus necessite l'UI Merchant Center ou l'API Content.
 *
 * Auteur:  Thibault Fayol — Thibault Fayol Consulting
 * Site:    https://thibaultfayol.com
 * Licence: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  EMAIL: "vous@domaine.com",
  RECENT_RANGE: "LAST_7_DAYS",
  PRIOR_RANGE: "LAST_30_DAYS",
  MIN_PRIOR_IMPRESSIONS: 10,
  SHEET_URL: ""
};

function main() {
  try {
    Logger.log("=== Alerteur Refus Merchant Center ===");
    Logger.log("Mode : " + (CONFIG.TEST_MODE ? "TEST (simulation)" : "PRODUCTION"));

    Logger.log("Etape 1 : Requete periode anterieure (" + CONFIG.PRIOR_RANGE + ")...");
    var requeteAnter =
      "SELECT segments.product_item_id, segments.product_title, segments.product_type_l1, " +
      "campaign.name, metrics.impressions, metrics.clicks " +
      "FROM shopping_performance_view " +
      "WHERE segments.date DURING " + CONFIG.PRIOR_RANGE + " " +
      "AND metrics.impressions >= " + CONFIG.MIN_PRIOR_IMPRESSIONS;

    var lignesAnter = AdsApp.search(requeteAnter);
    var produitsAnter = {};

    while (lignesAnter.hasNext()) {
      var row = lignesAnter.next();
      var id = row.segments.productItemId || "";
      if (id) {
        produitsAnter[id] = {
          id: id,
          titre: row.segments.productTitle || "(sans titre)",
          type: row.segments.productTypeL1 || "(sans type)",
          campagne: row.campaign.name || "(inconnue)",
          imprAnter: row.metrics.impressions,
          clicsAnter: row.metrics.clicks
        };
      }
    }

    Logger.log("Produits actifs anterieurement : " + Object.keys(produitsAnter).length);

    Logger.log("Etape 2 : Requete periode recente (" + CONFIG.RECENT_RANGE + ")...");
    var requeteRecente =
      "SELECT segments.product_item_id, metrics.impressions " +
      "FROM shopping_performance_view " +
      "WHERE segments.date DURING " + CONFIG.RECENT_RANGE + " " +
      "AND metrics.impressions > 0";

    var lignesRecentes = AdsApp.search(requeteRecente);
    var produitsActifs = {};

    while (lignesRecentes.hasNext()) {
      var ligneRecente = lignesRecentes.next();
      var idRecent = ligneRecente.segments.productItemId || "";
      if (idRecent) {
        produitsActifs[idRecent] = true;
      }
    }

    Logger.log("Produits actifs recemment : " + Object.keys(produitsActifs).length);

    var suspectesRefuses = [];
    var ids = Object.keys(produitsAnter);
    for (var i = 0; i < ids.length; i++) {
      if (!produitsActifs[ids[i]]) {
        suspectesRefuses.push(produitsAnter[ids[i]]);
      }
    }

    suspectesRefuses.sort(function(a, b) { return b.imprAnter - a.imprAnter; });
    Logger.log("Suspectes refuses : " + suspectesRefuses.length);

    var logLimit = Math.min(suspectesRefuses.length, 25);
    for (var j = 0; j < logLimit; j++) {
      var p = suspectesRefuses[j];
      Logger.log("  SUSPECTE : " + p.id + " | " + p.titre + " | Impr anter: " + p.imprAnter);
    }

    if (!CONFIG.TEST_MODE && CONFIG.SHEET_URL && suspectesRefuses.length > 0) {
      ecrireDansSheet(suspectesRefuses);
    }

    if (suspectesRefuses.length > 0) {
      envoyerAlerte(suspectesRefuses);
    } else {
      Logger.log("Aucun refus suspecte detecte.");
    }

    Logger.log("=== Termine ===");

  } catch (e) {
    Logger.log("ERREUR : " + e.message);
    MailApp.sendEmail(CONFIG.EMAIL, "Alerteur Refus MC — Erreur Script",
      "Erreur :\n\n" + e.message + "\n\nStack : " + e.stack);
  }
}

function ecrireDansSheet(produits) {
  var sheet = SpreadsheetApp.openByUrl(CONFIG.SHEET_URL).getActiveSheet();
  sheet.clearContents();

  var donnees = [["ID Produit", "Titre", "Type", "Campagne", "Impr Anterieures", "Clics Anterieurs", "Statut"]];
  for (var i = 0; i < produits.length; i++) {
    var p = produits[i];
    donnees.push([p.id, p.titre, p.type, p.campagne, p.imprAnter, p.clicsAnter, "Refus Suspecte"]);
  }

  sheet.getRange(1, 1, donnees.length, donnees[0].length).setValues(donnees);
  Logger.log("Sheet mis a jour avec " + produits.length + " refus suspectes.");
}

function envoyerAlerte(produits) {
  var compte = AdsApp.currentAccount().getName();
  var sujet = "Alerte Refus MC : " + produits.length + " produits suspectes — " + compte;

  var corps = "Alerteur Refus Merchant Center\n";
  corps += "Compte : " + compte + "\n";
  corps += "Periode recente : " + CONFIG.RECENT_RANGE + "\n";
  corps += "Periode anterieure : " + CONFIG.PRIOR_RANGE + "\n";
  corps += "Suspectes refuses : " + produits.length + "\n\n";
  corps += "IMPORTANT : Ces produits avaient des impressions avant mais plus maintenant.\n";
  corps += "Cela PEUT indiquer un refus, mais aussi budget, pause, ou saisonnalite.\n";
  corps += "Verifiez dans Google Merchant Center.\n\n";
  corps += "Produits suspectes refuses :\n";
  corps += "-------------------------------------------\n";

  var limit = Math.min(produits.length, 40);
  for (var i = 0; i < limit; i++) {
    var p = produits[i];
    corps += (i + 1) + ". " + p.titre + "\n";
    corps += "   ID: " + p.id + " | Type: " + p.type + " | Impr anter: " + p.imprAnter + "\n";
  }

  if (produits.length > limit) {
    corps += "\n... et " + (produits.length - limit) + " autres.\n";
  }

  corps += "\nAction : verifiez ces produits dans Google Merchant Center.\n";

  MailApp.sendEmail(CONFIG.EMAIL, sujet, corps);
  Logger.log("Email d'alerte envoye a " + CONFIG.EMAIL);
}
