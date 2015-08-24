/**
 * @fileOverview U Grok It Cordova API
 * Copyright (c) U Grok It 2013
 */

// Internal
var argscheck = require('cordova/argscheck'),
    channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

//
// Wait for initialization
//
channel.createSticky('onHaveSdkStaticInfo');
// Tell cordova channel to wait on the CordovaInfoReady event
channel.waitForInitialization('onHaveSdkStaticInfo');

//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------
/**
 * @class Core class for U Grok It access. This class is accessed via the "ugi" single object
 * in the global scope (the window object).
 */ 
function Ugi() {
  /**
   * Connection states sent to connect state callbacks and stored in the connectionState property.
   * @readonly
   * @enum {Number}
   */
  this.ConnectionStates = {
    /** Nothing connected to audio port */
    NOT_CONNECTED: 0,
    /** Something connected to audio port, trying to connect */
    CONNECTING: 1,
    /** Connected to an reader with incompatible firmware */
    INCOMPATIBLE_READER: 2,
    /** Connected to reader */
    CONNECTED: 3
  };
  /**
   * Memory banks passed tiowriteTag()
   * @readonly
   * @enum {Number}
   */
  this.MemoryBanks = {
    RESERVED: 0,
    EPC: 1,
    TID: 2,
    USER: 3
  };
  /**
   * Types of logging passed to setLogging()
   * @readonly
   * @enum {Number}
   */
  this.LoggingTypes = {
    INTERNAL_BYTE_PROTOCOL: 0x1,
    INTERNAL_CONNECTION_ERRORS: 0x2,
    INTERNAL_CONNECTION_STATE: 0x4,
    INTERNAL_PACKET_PROTOCOL: 0x8,
    INTERNAL_COMMAND: 0x10,
    INTERNAL_INVENTORY: 0x20,
    INTERNAL_FIRMWARE_UPDATE: 0x40,
    /** Connection and inventory state */
    STATE: 0x1000,
    /** Inventory activity */
    INVENTORY: 0x2000,
    /** Inventory details */
    INVENTORY_DETAIL: 0x4000
  };
  
  //
  // Our version
  //
  /**
   * U Grok It Cordova plugin version
   * SDK versions before 0.10.1 are no longer supported<br>
   * <br><br>
   *  Version 0.10.1 - November 13, 2013<br>
   *    Updates for iOS and Android SDKs 0.10.1<br>
   *  Version 0.10.3 - November 25, 2013<br>
   *    Updates for iOS and Android SDKs 0.10.3<br>
   *  Version 0.10.4 - December 5, 2013<br>
   *    Updates for iOS and Android SDKs 0.10.4<br>
   *  Version 1.0.2 - March 17, 2014<br>
   *    Updates for iOS and Android SDKs 1.0.2<br>
   *  Version 1.1.1 - April 25, 2014<br>
   *    Bug fix in RFID Configuration<br>
   *    Change UGI_MIN_EPC_LENGTH from 8 to 4<br>
   *    Tweak settings for INVENTORY_DISTANCE<br>
   *    Move to Cordova 3.4.1<br>
   *  Version 1.2.1 - July 7, 2014 - Reader protocol 14<br>
   *    Production Grokker compatibility<br>
   *    Changing power during inventory<br>
   *  Version 1.3.1 - August 2, 2014 - Reader protocol 15<br>
   *    More options for SELECT before inventory<br>
   *    Improved device compatibility<br>
   *    Optional data reading on every tag read<br>
   *  Version 1.4.1 - September 10, 2014 - Reader protocol 17<br>
   *    RFID configuration changes<br>
   *    Bug fixes<br>
   *  Version 1.5.2 - November 12, 2014 - Reader protocol 19<br>
   *    Bug fixes and performance improvement<br>
   *  Version 1.6.1 - December 18, 2014 - Reader protocol 19<br>
   *    EU Grokker support (region setting)<br>
   *  Version 1.6.2 - January 13, 2015 - Reader protocol 19<br>
   *    Properly close connection when changing pages<br>
   *  Version 1.7.2 - February 5, 2015 - Reader protocol 19<br>
   *    Streamlined UI for housekeeping tasks (set region and firmware update)<br>
   *  Version 1.7.3 - February 11, 2015 - Reader protocol 19<br>
   *   Bug fix for app inactive/active while inventory is running<br>
   *  Version 1.7.4 - February 19, 2015 - Reader protocol 19<br>
   *   Bug fix for inventory.isScanning<br>
   *  Version 1.7.5 - March 9, 2015 - Reader protocol 19<br>
   *   Bug fix for passing both a select mask and EPCs to startInventory<br>
   *  Version 1.7.6 - March 26, 2015 - Reader protocol 19<br>
   *   Better handling of protocol errors while starting/stopping inventory<br>
   *  Version 1.7.7 - April 8, 2015 - Reader protocol 19<br>
   *   Minor bug fixes with setting region<br>
   *  Version 1.7.8 - April 25, 2015 - Reader protocol 19<br>
   *   Bug fix for intermittent issue with pausing/resuming connection<br>
   *   Bug fix with pausing/resuming inventory<br>
   *  Version 1.7.9 - May 13, 2015 - Reader protocol 19<br>
   *   Bug fix for setting "handle screen rotation" in Android<br>
   *  Version 1.7.10 - May 14, 2015 - Reader protocol 19<br>
   *   Expanded Android device support<br>
   *  Version 1.7.11 - May 26, 2015 - Reader protocol 20<br>
   *   Expanded Android device support (in conjunction with firmware 1.9.5)<br>
   *  Version 1.7.13 - July 9, 2015 - Reader protocol 20<br>
   *   Do not allow getting battery level during firmware update<br>
   *   Android: Change directory structure to be plugman compatible<br>
   *   Android: SDK 1.7.13 with bug fix<br>
   *  Version 1.7.14 - July 14, 2015 - Reader protocol 20<br>
   *   Fix bug in writeTag parameter checking<br>
   *  Version 1.7.15 - July 27, 2015 - Reader protocol 20<br>
   *   Android: fix bug with low-level filters and large numbers of tags<br>
   *  Version 1.7.16 - August 15, 2015 - Reader protocol 20<br>
   *   Fix crashing bug with setting region<br>
   * @type {String}
   * @readonly
   */
  this.pluginVersion = "1.7.16";

  //
  // Static properties that we get at load time so they are available without callbacks
  //
  /**
   * U Grok It Native SDK Version
   * @type {String}
   * @readonly
   */
  this.nativeSdkVersion = "";
  /**
   * SDK Version, date/time
   * @type {Date}
   * @readonly
   */
  this.nativeSdkVersionDateTime = null;
               
  //
  // Properties cached in JavaScript that change on connectionStateChanged
  //
  /**
   * Whether the reader is connected
   * @type {Boolean}
   * @readonly
   */
  this.isConnected = false;
  /**
   * The current connection state
   * @type {ugi.ConnectionStates}
   * @readonly
   */
  this.connectionState = this.ConnectionStates.NOT_CONNECTED;
  /**
   * Has openConnection has been called (without a corresponding call to closeConnecion)
   * @type {Boolean}
   * @readonly
   */
  this.isInOpenConnection = false;
  /**
   * Is anything is plugged into the audio jack (as best we can determine)
   * @type {Boolean}
   * @readonly
   */
  this.isAnythingPluggedIntoAudioJack = false;
  /**
   * Protocol version that the host requires
   * @type {String}
   * @readonly
   */
  this.requiredProtocolVersion = "";
  /**
   * Protocol version that the host supports
   * @type {String}
   * @readonly
   */
  this.supportedProtocolVersion = "";
  /**
   * Reader protocol version
   * @type {String}
   * @readonly
   */
  this.readerProtocolVersion = "";
  /**
   * Reader's hardware model
   * @type {String}
   * @readonly
   */
  this.readerHardwareModel = "";
  /**
   * Reader's serial number
   * @type {String}
   * @readonly
   */
  this.readerSerialNumber = "";
  /**
   * Firmware version in the reader, major
   * @type {String}
   * @readonly
   */
  this.firmwareVersion = "";
  /**
   * Reader's region name
   * @type {String}
   * @readonly
   */
  this.regionName = "";
  /**
   * Maximum number of volume levels
   * @type {Number}
   * @readonly
   */
  this.numVolumeLevels = 0;
  /**
   * Battery capacity in minutes
   * @type {Number}
   * @readonly
   */
  this.batteryCapacity = 0;
  /**
   * Battery capacity in mAh
   * @type {Number}
   * @readonly
   */
  this.batteryCapacity_mAh = 0;
  /**
   * Description of the reader, generally used for debugging
   * @type {String}
   * @readonly
   */
  this.readerDescription = "";
  
  /**
   * Active inventory
   * @type {UgiInventory}
   * @readonly
   */
  this.activeInventory = null;

  ///////////////////////////////////////////////////////////////////////////////////////////////////

  //
  // When Cordova is ready, get the static properties
  //
  var me = this;
  channel.onCordovaReady.subscribe(function() {
    exec(function(info) {
      me.available = true;
      me.nativeSdkVersion = info.sdkVersionMajor + "." + info.sdkVersionMinor + "." + info.sdkVersionBuild;
      me.nativeSdkVersionDateTime = new Date(info.sdkVersionDateTime);
      channel.onHaveSdkStaticInfo.fire();
    }, null, "ugrokit", "getSdkStaticInfo", []);
  });
  
  //
  // Add a connection state listener
  //
  this.addConnectionStateCallback(function(connectionState, o) {
    me.isConnected = connectionState == me.ConnectionStates.CONNECTED;
    me.connectionState = connectionState;
    me.isAnythingPluggedIntoAudioJack = o.isAnythingPluggedIntoAudioJack;
    me.requiredProtocolVersion = o.requiredProtocolVersion;
    me.supportedProtocolVersion = o.supportedProtocolVersion;
    me.readerProtocolVersion = o.readerProtocolVersion;
    me.readerHardwareModel = o.readerHardwareModel;
    me.readerSerialNumber = o.readerSerialNumber;
    me.firmwareVersion = o.firmwareVersion;
    me.regionName = o.regionName;
    me.numVolumeLevels = o.numVolumeLevels;
    me.batteryCapacity = o.batteryCapacity;
    me.batteryCapacity_mAh = o.batteryCapacity_mAh;
    me.readerDescription = o.readerDescription;
  });
}

//------------------------------------
// Logging
//------------------------------------

//
// Stringify anything for logging
//
Ugi.prototype.stringify = function(o) {
  if (o == null) return "[null]";
  else if (typeof o == "undefined") return "[undefined]";
  else if (Array.isArray(o)) {
    var s = "[";
    for (var i = 0; i < o.length; i++) {
      if (i) s += ",";
      s += this.stringify(o[i]);
    }
    return s + "]";
  } else {
    return o+"";
  }
};

/**
 * Log to the device's native log
 * @param [arguments] Objects to log
 */
Ugi.prototype.log = function() {
  var s = "";
  for (var i = 0; i < arguments.length; i++) {
    s += this.stringify(arguments[i]);
  }
  exec(null, null, "ugrokit", "log", [s]);
};

/**
 * Set logging (to native log)
 * @param logging    ugi.LoggingTypes.XXX
 */
Ugi.prototype.setLogging = function(logging) {
  argscheck.checkArgs("n", "setLogging", arguments);
  exec(null, null, "ugrokit", "setLogging", [logging]);
};

//------------------------------------
// Connections
//------------------------------------

/**
 * Try to open a connection to the reader.
 * <br><br>
 * openConnection returns immediately, it does not wait for a connection to the reader
 * to actually be established. If a reader is connected, the connection takes 400-500ms
 * (just under half a second) for the connection sequence. Your app can get notification
 * of connection state changes via addConnectionStateCallback()
 */
Ugi.prototype.openConnection = function() {
  argscheck.checkArgs("", "Ugi.openConnection", arguments);
  this.isInOpenConnection = true;
  exec(null, null, "ugrokit", "openConnection", []);
};

/**
 * Close the connection to the Grokker. Connections are automatically closed when a page is unloaded.
 */
Ugi.prototype.closeConnection = function() {
  argscheck.checkArgs("", "Ugi.closeConnection", arguments);
  this.isInOpenConnection = false;
  exec(null, null, "ugrokit", "closeConnection", []);
};

Ugi.callbackId = 0;

/**
 * Add a callback for connection state changes.
 * @param callback Callback to add. The callback is called with one argument, the new connection state
 * @return the callback function (to be passed to removeConnectionStateCallback if needed)
 */
Ugi.prototype.addConnectionStateCallback = function(callback) {
  argscheck.checkArgs("f", "Ugi.addConnectionStateCallback", arguments);
  callback._callbackId = Ugi.callbackId;
  exec(function(o) {
    callback(o.state, o);
  }, null, "ugrokit", "addConnectionStateCallback", [Ugi.callbackId]);
  Ugi.callbackId++;
  return callback;
}

/**
 * Remove a callback for connection state changes
 * @param callback Callback to remove
 */
Ugi.prototype.removeConnectionStateCallback = function(callback) {
  exec(null, null, "ugrokit", "removeConnectionStateCallback", [callback._callbackId]);
}

/**
 * Set whether screen rotation should be handled
 * @param handleScreenRotation  true to handle screen rotation
 */
Ugi.prototype.setHandleScreenRotation = function(handleScreenRotation) {
  exec(null, null, "ugrokit", "setHandleScreenRotation", [handleScreenRotation]);
};

//------------------------------------
// Inventory
//------------------------------------

/**
 * Start running inventory (if a reader is connected).
 *
 * If one or more EPCs are passed in, only they will be reported back to the delegate
 * If no EPCs are passed then all EPCs will be reported back to the delegate.
 * <br><br>
 * If a small number of EPCs are passed (<=maxEpcsSentToReader), filtering is done on the
 * reader and the reader plays sounds immediately (with no host interaction).
 * Otherwise filtering is done on the host, and the host tells the reader when to play sounds
 * which is slower.
 * <br><br>
 * The inventory code keeps a history for each tag. This history is the number of finds for each
 * time interval. The default is to store history for 20 intervals of 500ms each. This default can
 * be modified via properties: historyIntervalMSec and historyDepth.
 * <br><br>
 * The inventoryType allows using a preset mode based on the type of operation being performed,
 * or using the manually configured values.
 *
 * @param {Object} delegate  Delegate object to report back to
 * @param {Object} config    UgiRfidConfiguration object
 * @param {Array} epcs       EPCs to find, all other EPCs are ignored (or null to find all EPCs)
 @ @param {Boolean} epcsAreIgnoreList  TRUE to ingore all the EPCs passed, FALSE to search for them only
 * @return   UgiInventory object
 */
Ugi.prototype.startInventory = function(delegate, config, epcs, epcsAreIgnoreList) {
  argscheck.checkArgs("ooA*", "Ugi.startInventory", arguments);
  this.activeInventory = new UgiInventory(delegate, config, epcs, epcsAreIgnoreList);
  return this.activeInventory;
};

//------------------------------------
// Battery
//------------------------------------

/**
 * Get battery information. This cannot be called while scanning.
 * @param callback Called with one parameter of type UgiBatteryInfo
 */
Ugi.prototype.getBatteryInfo = function(callback) {
  argscheck.checkArgs("f", "getBatteryInfo", arguments);
  exec(callback, null, "ugrokit", "getBatteryInfo", []);
};

//------------------------------------
// Firmware update
//------------------------------------

/**
 * Check for firmware update automatically
 * @param callback Called with (required, name, notes)
 */
Ugi.prototype.automaticCheckForFirmwareUpdate = function(callback) {
  argscheck.checkArgs("f", "automaticCheckForFirmwareUpdate", arguments);
  exec(callback, null, "ugrokit", "automaticCheckForFirmwareUpdate", []);
};

/**
 * Load an update.
 * @param callback Called with (succes)
 */
Ugi.prototype.loadUpdateWithName = function(name, callback) {
  argscheck.checkArgs("sf", "loadUpdateWithName", arguments);
  exec(function(o) {
    callback(o.success);
  }, null, "ugrokit", "loadUpdateWithName", [name]);
};

/**
 * Update firmware that has been previously loaded with loadUpdateWithName
 * @param progressCallback Called with (amountDone, amountTotal, canCancel)
 * @param completedCallback Called with (success, seconds)
 */
Ugi.prototype.firmwareUpdate = function(progressCallback, completedCallback) {
  argscheck.checkArgs("f", "firmwareUpdate", arguments);
  exec(function(o) {
    if (o.seconds) {
      if(completedCallback) completedCallback(o.success, o.seconds);
    } else {
      if (progressCallback) progressCallback(o.amountDone, o.amountTotal, o.canCancel);
    }
  }, null, "ugrokit", "firmwareUpdate", []);
};

/**
 * Force rechecking for firmware update
 * @param onlyIfSomeTimeHasPassed
 */
Ugi.prototype.forceFirmwareChannelReload = function(onlyIfSomeTimeHasPassed) {
  exec(null, null, "ugrokit", "forceFirmwareChannelReload", [onlyIfSomeTimeHasPassed ? true : false]);
};

/**
 * Force rechecking for firmware update
 */
Ugi.prototype.forceFirmwareGrokkerCheck = function() {
  argscheck.checkArgs("f", "forceFirmwareGrokkerCheck", arguments);
  exec(null, null, "ugrokit", "forceFirmwareGrokkerCheck", []);
};

//------------------------------------
// Region
//------------------------------------

/**
 * See if the user must set the region
 * @param callback Called with one parameter of type boolean
 */
Ugi.prototype.userMustSetRegion = function(callback) {
  argscheck.checkArgs("f", "userMustSetRegion", arguments);
  exec(function(o) {
    callback(o.value);
  }, null, "ugrokit", "userMustSetRegion", []);
};

/**
 * See if the user can set the region
 * @param callback Called with one parameter of type boolean
 */
Ugi.prototype.userCanSetRegion = function(callback) {
  argscheck.checkArgs("f", "userCanSetRegion", arguments);
  exec(function(o) {
    callback(o.value);
  }, null, "ugrokit", "userCanSetRegion", []);
};

/**
 * Get the regions available. This accessed the U Grok It server to get the list of regions
 * that the Grokker is approved to operate in. This must be called before "setRegion" is called.
 * @param callback Called with two parameters: an array of strings (region names) and an int (selected index)
 */
Ugi.prototype.getRegionNames = function(callback) {
  argscheck.checkArgs("f", "getRegionNames", arguments);
  exec(function(o) {
    callback(o.regionNames, o.selectedIndex);
  }, null, "ugrokit", "getRegionNames", []);
};

/**
 * Get the regions available. This accessed the U Grok It server to get the list of regions
 * that the Grokker is approved to operate in. This must be called before "setRegion" is called.
 * @param regionName Region name to set
 * @param completion Completion code after region is set
 */
Ugi.prototype.setRegion = function(regionName, completion) {
  argscheck.checkArgs("sf", "setRegion", arguments);
  exec(function(o) {
    completion(o.success);
  }, null, "ugrokit", "setRegion", [regionName]);
};

//------------------------------------
 
module.exports = new Ugi();
