window.MEILP = window.MEILP || {};

/**
 * Lightweight validation helpers for assignment configuration and cards.
 */

/**
 * Returns true when an object owns every required key.
 */
function hasRequiredKeys(object, requiredKeys) {
  if (!object || typeof object !== "object") {
    return false;
  }

  const keys = Array.isArray(requiredKeys) ? requiredKeys : [];
  return keys.every((key) => Object.prototype.hasOwnProperty.call(object, key));
}

/**
 * Returns true when an assignment card has the expected public fields.
 */
function validateAssignmentCard(card) {
  return hasRequiredKeys(card, ["id", "title", "summary", "status"]);
}

/**
 * Filters malformed assignment cards without mutating the input array.
 */
function filterValidAssignmentCards(cards) {
  if (!Array.isArray(cards)) {
    return [];
  }

  return cards.filter(validateAssignmentCard);
}

window.MEILP.hasRequiredKeys = hasRequiredKeys;
window.MEILP.validateAssignmentCard = validateAssignmentCard;
window.MEILP.filterValidAssignmentCards = filterValidAssignmentCards;
