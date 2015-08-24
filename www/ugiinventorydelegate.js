/**
 * @class This class documents the methods of the delegate object passed to ugi.startInventory()
 *        and constants constants used in those methods.
 */ 
function UgiInventoryDelegate() {
}

/**
 * Values passed to ugiInventoryDidStop()
 * @readonly
 * @enum {Number}
 */
UgiInventoryDelegate.InventoryCompletedReturnValues = {
  /** Inventory completed normally */
  OK: 0,
  /** Error sending inventory command to reader */
  ERROR_SENDING: 98,
  /** Lost connection to the reader */
  LOST_CONNECTION: 99,
  /** Reader error */
  SPI_NOT_WORKING: 1,
  /** Reader error */
  ENABLE_PIN_NOT_WORKING: 2,
  /** Reader error */
  INTERRUPT_PIN_NOT_WORKING: 3,
  /** Reader error */
  WRONG_CHIP_VERSION: 4,
  /** Reader error */
  CRYSTAL_NOT_STABLE: 5,
  /** Reader error */
  PLL_NOT_LOCKED: 6,
  /** Battery */
  BATTERY_TOO_LOW: 7,
  /** Temperature */
  TEMPERATURE_TOO_HIGH: 8,
  /** Reader error */
  NOT_PROVISIONED: 9,
  /** Region must be set */
  REGION_NOT_SET: 10
};

/**
 * The reader has started doing inventory. This can happen multiple times during a single
 * startInventory call, since the reader can be connected and disconnected from the host.
 */
UgiInventoryDelegate.prototype.ugiInventoryDidStart = function() {};

/**
 * The reader has stopped doing inventory
 * @param result Result of inventory (UgiInventoryDelegate.InventoryCompletedReturnValues.xxx)
 */
UgiInventoryDelegate.prototype.ugiInventoryDidStop = function(result) {};

/**
 * The visibility of a tag has changed.<br>
 * - A tag has been found for the first time<br>
 * - A tag has not been seen for the history period (interval * depth)<br>
 * - A tag that had not been seen for the history period has reappeared
 * @param tag        The tag that has changed
 * @param firstFind  YES if this is the first time this tag has been found
 */
UgiInventoryDelegate.prototype.ugiInventoryTagChanged = function(tag, firstFind) {};

/**
 * A new tag has been found
 * @param tag The tag that was found
 * @param detailedPerReadData   Array of UgiDetailedPerReadData obejcts, if detailed per-read data was requested
 */
UgiInventoryDelegate.prototype.ugiInventoryTagFound = function(tag, detailedPerReadData) {};

/**
 * A previously found tag has been found again
 * @param tag     The tag
 * @param count   The number of finds since ugiInventoryTagSubsequentFinds was last called
 * @param detailedPerReadData   Array of UgiDetailedPerReadData obejcts, if detailed per-read data was requested
 */
UgiInventoryDelegate.prototype.ugiInventoryTagSubsequentFinds = function(tag, count, detailedPerReadData) {};

/**
 * A history interval has passed.
 * This method is called at the end of each history interval IF one or more
 * tags are currently visible
 */
UgiInventoryDelegate.prototype.ugiInventoryHistoryInterval = function() {};

//------------------------------------

module.exports = UgiInventoryDelegate;
