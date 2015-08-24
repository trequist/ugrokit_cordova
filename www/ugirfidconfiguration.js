var argscheck = require('cordova/argscheck'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

/**
 * @class This class encapsulates the RFID configuration.
 */
function UgiRfidConfiguration() {
  /** Power level for running inventory, in dbM */
  this.initialPowerLevel = 0;
  /** Minimum power level for running inventory, in dBm (0 = max) */
  this.minPowerLevel = 0;
  /** Maximum power level for running inventory, in dBm (0 = max) */
  this.maxPowerLevel = 0;
  /** Initial "Q" value to use when running inventory */
  this.initialQValue = 0;
  /** Minimum "Q" value to use when running inventory */
  this.minQValue = 0;
  /** Maximum "Q" value to use when running inventory */
  this.maxQValue = 0;
  /** Sensitivity level for reading/writing tags, db */
  this.session = 0;
  /** number of inventory rounds with no finds after which to toggle A/B (0 = never toggle) */
  this.roundsWithNoFindsToToggleAB = 0;
  /** Sensitivity level for running inventory, db */
  this.sensitivity = 0;
  /** Power level for writing tags, in dBm (0 = max) */
  this.powerLevelWrite = 0;
  /** Sensitivity level for writing tags, db (0 = max) */
  this.sensitivityWrite = 0;
  /** TRUE for reader to use this listen-before-talk setting, if allowed (default is FALSE) */
  this.setListenBeforeTalk = false;
  /** TRUE for reader to listen-before-talk (default is FALSE) */
  this.listenBeforeTalk = false;

  /** Maximum number of inventory rounds per second (0 = no limit) */
  this.maxRoundsPerSecond = 0;
  /** Minimum number of TID memory bank bytes to return. If the TID memory size is known, set minTidBytes=maxTidBytes */
  this.minTidBytes = 0;
  /** Maximum number of TID memory bank bytes to return (0 = don't read TID). Currently supported up to 208 bytes. */
  this.maxTidBytes = 0;
  /** Minimum number of USER memory bank bytes to return. If the USER memory size is known, set minUserBytes=maxUserBytes */
  this.minUserBytes = 0;
  /** Maximum number of USER memory bank bytes to return (0 = don't read USER). Currently supported up to 208 bytes. */
  this.maxUserBytes = 0;
  /** Minimum number of RESERVED memory bank bytes to return. If the RESERVED memory size is known, set minReservedBytes=maxReservedBytes */
  this.minReservedBytes = 0;
  /** Maximum number of RESERVED memory bank bytes to return (0 = don't read RESERVED). Currently supported up to 208 bytes. */
  this.maxReservedBytes = 0;

  /** Mask to use in SELECT before inventory round. If nil (the default) then no SELECT is done before each inventory */
  this.selectMask = "";
  /** Length of the mask, in bits. If zero, then selectMask.length*8 is used */
  this.selectMaskBitLength = 0;
  /** Bit offset for SELECT */
  this.selectOffset = 0;
  /** Memory bank for SELECT */
  this.selectBank = ugi.MemoryBanks.EPC;

  /** TRUE to run inventory until stopped, NO to run inventory once (default is TRUE) */
  this.continual = true;
  /** TRUE for reader to report RSSI data (default is FALSE) */
  this.reportRssi = false;
  
  /** TRUE for reader to report detailed data for each read (default is FALSE) */
  this.detailedPerReadData = false;
  
  //! Number of words for reader to read every time the tags is read (0, 1, or 2)
  this.detailedPerReadNumReads = 0;

  //! memory bank #1 to read for detailed per-read
  this.detailedPerReadMemoryBank1 = ugi.MemoryBanks.EPC;

  //! word offset #1 to read for detailed per-read
  this.detailedPerReadWordOffset1 = 0;

  //! memory bank #2 to read for detailed per-read
  this.detailedPerReadMemoryBank2 = ugi.MemoryBanks.EPC;

  //! word offset #2 to read for detailed per-read
  this.detailedPerReadWordOffset2 = 0;

  /** TRUE to report subsequent finds */
  this.reportSubsequentFinds = false;
  /** Type of sounds to make when tags are found */
  this.soundType = 0;
  /** Volume level (0...1) */
  this.inventoryVolume = 0;
  /** Length of each history period (default is 500ms) */
  this.historyIntervalMSec = 0;
  /** Number of history periods (default is 20) */
  this.historyDepth = 0;
}

UgiRfidConfiguration.configValues = null;
UgiRfidConfiguration.names = null;

channel.createSticky('onHaveRfidConfig');
channel.waitForInitialization('onHaveRfidConfig');
//
// When Cordova is ready, get the static properties
//
channel.onCordovaReady.subscribe(function() {
  exec(function(valuesAndNames) {
    UgiRfidConfiguration.configValues = valuesAndNames[0];
    UgiRfidConfiguration.names = valuesAndNames[1];
    channel.onHaveRfidConfig.fire();
  }, null, "ugrokit", "getRfidConfigs", []);
}); // Comment so backUpdate.sh works

UgiRfidConfiguration.SoundTypes = {
  /** Make no sounds */
  UGI_INVENTORY_SOUNDS_NONE: 0,
  /** Geiger counter sounds when epc(s) are found */
  UGI_INVENTORY_SOUNDS_GEIGER_COUNTER: 1,
  /** Found-item sound once when epc is first found */
  UGI_INVENTORY_SOUNDS_FIRST_FIND: 2,
  /** Found-item sound once when epc is first found and special sound for last tag */
  UGI_INVENTORY_SOUNDS_FIRST_FIND_AND_LAST: 6
};

/**
 * Inventory types passed to startInventory.
 * @readonly
 * @enum {Number}
 */
UgiRfidConfiguration.InventoryTypes = {
  /** Locate at a distance */
  LOCATE_DISTANCE: 1,
  /** Inventory (count) a large number of tags relatively close */
  INVENTORY_SHORT_RANGE: 2,
  /** Inventory (count) a at a distance */
  INVENTORY_DISTANCE: 3,
  /** Locate at short range */
  LOCATE_SHORT_RANGE: 4,
  /** Locate at very short range */
  LOCATE_VERY_SHORT_RANGE: 5
};

//------------------------------------

/**
 * Get a configuration object for a pre-defined inventory type
 */
UgiRfidConfiguration.configWithInventoryType = function(inventoryType) {
  var i = (inventoryType-1)*37;
  var c = new UgiRfidConfiguration();
  var d = UgiRfidConfiguration.configValues;
  c.initialPowerLevel = d[i+0];
  c.minPowerLevel = d[i+1];
  c.maxPowerLevel = d[i+2];
  c.initialQValue = d[i+3];
  c.minQValue = d[i+4];
  c.maxQValue = d[i+5];
  c.session = d[i+6];
  c.roundsWithNoFindsToToggleAB = d[i+7];
  c.sensitivity = d[i+8];
  c.powerLevelWrite = d[i+9];
  c.sensitivityWrite = d[i+10];
  c.setListenBeforeTalk = d[i+11];
  c.listenBeforeTalk = d[i+12];
  c.maxRoundsPerSecond = d[i+13];
  c.minTidBytes = d[i+14];
  c.maxTidBytes = d[i+15];
  c.minUserBytes = d[i+16];
  c.maxUserBytes = d[i+17];
  c.minReservedBytes = d[i+18];
  c.maxReservedBytes = d[i+19];
  c.continual = d[i+20];
  c.reportRssi = d[i+21];
  c.detailedPerReadData = d[i+22];
  c.reportSubsequentFinds = d[i+23];
  c.soundType = d[i+24];
  c.volume = d[i+25];
  c.historyIntervalMSec = d[i+26];
  c.historyDepth = d[i+27];
  c.selectMask = d[i+28];
  c.selectMaskBitLength = d[i+29];
  c.selectOffset = d[i+30];
  c.selectBank = d[i+31];
  c.detailedPerReadNumReads = d[i+32];
  c.detailedPerReadMemoryBank1 = d[i+33];
  c.detailedPerReadWordOffset1 = d[i+34];
  c.detailedPerReadMemoryBank2 = d[i+35];
  c.detailedPerReadWordOffset2 = d[i+36];
  return c;
};

UgiRfidConfiguration.nameForInventoryType = function(inventoryType) {
  return UgiRfidConfiguration.names[inventoryType-1];
};

UgiRfidConfiguration.prototype.values = function() {
  return [
    this.initialPowerLevel,
    this.minPowerLevel,
    this.maxPowerLevel,
    this.initialQValue,
    this.minQValue,
    this.maxQValue,
    this.session,
    this.roundsWithNoFindsToToggleAB,
    this.sensitivity,
    this.powerLevelWrite,
    this.sensitivityWrite,
    this.setListenBeforeTalk,
    this.listenBeforeTalk,
    this.maxRoundsPerSecond,
    this.minTidBytes,
    this.maxTidBytes,
    this.minUserBytes,
    this.maxUserBytes,
    this.minReservedBytes,
    this.maxReservedBytes,
    this.continual,
    this.reportRssi,
    this.detailedPerReadData,
    this.reportSubsequentFinds,
    this.soundType,
    this.volume,
    this.historyIntervalMSec,
    this.historyDepth,
    this.selectMask,
    this.selectMaskBitLength,
    this.selectOffset,
    this.selectBank,
    this.detailedPerReadNumReads,
    this.detailedPerReadMemoryBank1,
    this.detailedPerReadWordOffset1,
    this.detailedPerReadMemoryBank2,
    this.detailedPerReadWordOffset2
    ];
};

//
// Stringify
//
UgiRfidConfiguration.prototype.toString = function() {
  var s = "UgiRfidConfiguration: ";
  s += "initialPowerLevel = " + this.initialPowerLevel;
  s += ", minPowerLevel = " + this.initialPowerLevel;
  s += ", maxPowerLevel = " + this.minPowerLevel;
  s += ", initialQValue = " + this.initialQValue;
  s += ", minQValue = " + this.minQValue;
  s += ", maxQValue = " + this.maxQValue;
  s += ", session = " + this.session;
  s += ", roundsWithNoFindsToToggleAB = " + this.roundsWithNoFindsToToggleAB;
  s += ", sensitivity = " + this.sensitivity;
  s += ", powerLevelWrite = " + this.powerLevelWrite;
  s += ", sensitivityWrite = " + this.sensitivityWrite;
  s += ", setListenBeforeTalk = " + this.setListenBeforeTalk;
  s += ", listenBeforeTalk = " + this.listenBeforeTalk;
  s += ", maxRoundsPerSecond = " + this.maxRoundsPerSecond;
  s += ", minTidBytes = " + this.minTidBytes;
  s += ", maxTidBytes = " + this.maxTidBytes;
  s += ", minUserBytes = " + this.minUserBytes;
  s += ", maxUserBytes = " + this.maxUserBytes;
  s += ", minReservedBytes = " + this.minReservedBytes;
  s += ", maxReservedBytes = " + this.maxReservedBytes;
  s += ", continual = " + this.continual;
  s += ", reportRssi = " + this.reportRssi;
  s += ", detailedPerReadData = " + this.detailedPerReadData;
  s += ", reportSubsequentFinds = " + this.reportSubsequentFinds;
  s += ", soundType = " + this.soundType;
  s += ", volume = " + this.volume;
  s += ", historyIntervalMSec = " + this.historyIntervalMSec;
  s += ", historyDepth = " + this.historyDepth;
  s += ", selectMask = " + this.selectMask;
  s += ", selectMaskBitLength = " + this.selectMaskBitLength;
  s += ", selectOffset = " + this.selectOffset;
  s += ", selectBank = " + this.selectBank;
  return s;
};

//------------------------------------

module.exports = UgiRfidConfiguration;

