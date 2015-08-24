/**
 * @fileOverview U Grok It Cordova API
 * Copyright (c) U Grok It 2013
 */

// Internal
var argscheck = require('cordova/argscheck'),
    exec = require('cordova/exec');

/**
 * @class An inventory session
 */ 
function UgiInventory(delegate, config, epcs, epcsAreIgnoreList) {
  /**
   * Time the inventory was started
   * @type {Date}
   * @readonly
   */
  this.startTime = new Date();
  /**
   * True if inventory is temporarily stopped
   * @type {Boolean}
   * @readonly
   */
  this.isPaused = false;
  /**
   * True if inventory is actively scanning
   * @type {Boolean}
   * @readonly
   */
  this.isScanning = false;
  
  /**
   * Map of EPCs to tags
   */
  this.tagsByEpc = {};
  
  this.internalId = "" + UgiInventory.nextId++;
  var _this = this;
  exec(function(o) {
    if (o._cb == "didStart") {
      _this.isScanning = true;
      if (delegate.ugiInventoryDidStart) {
        delegate.ugiInventoryDidStart();
      }
    } else if (o._cb == "didStop") {
      _this.isScanning = false;
      if (!_this.isPaused &&
          (o.result != UgiInventoryDelegate.InventoryCompletedReturnValues.LOST_CONNECTION)) {
        ugi.activeInventory = null;
        delete _this.internalId;
      }
      if (delegate.ugiInventoryDidStop) {
        delegate.ugiInventoryDidStop(o.result);
      }
    } else if (o._cb == "tagChanged") {
      if (delegate.ugiInventoryTagChanged) {
        delegate.ugiInventoryTagChanged(_this._tagFromObject(o), o.firstFind);
      }
    } else if (o._cb == "tagFound") {
      if (delegate.ugiInventoryTagFound) {
        delegate.ugiInventoryTagFound(_this._tagFromObject(o), _this._detailsFromObject(o));
      }
    } else if (o._cb == "tagSubsequentFinds") {
      if (delegate.ugiInventoryTagSubsequentFinds) {
        delegate.ugiInventoryTagSubsequentFinds(_this._tagFromObject(o), o.count, _this._detailsFromObject(o));
      }
    } else if (o._cb == "historyInterval") {
      if (delegate.ugiInventoryHistoryInterval) {
        delegate.ugiInventoryHistoryInterval();
      }
    }
  }, null, "ugrokit", "startInventory",
  [this.internalId, config.values(), epcs, epcsAreIgnoreList,
  !!delegate.ugiInventoryTagChanged, !!delegate.ugiInventoryTagFound,
  !!delegate.ugiInventoryTagSubsequentFinds, !!delegate.ugiInventoryTagForgotten,
  !!delegate.ugiInventoryHistoryInterval]
  );
}

UgiInventory.nextId = 0;

UgiInventory.prototype._tagFromObject = function(o) {
  if (o.tag_epc) {
    var tag = this.tagsByEpc[o.tag_epc];
    if (tag) {
      tag.readState = new UgiTagReadState(o, tag);
    } else {
      tag = new UgiTag(o);
      this.tagsByEpc[o.tag_epc] = tag;
    }
    return tag;
  } else {
    return null;
  }
};

UgiInventory.prototype._detailsFromObject = function(o) {
  if (o.perread_timestamp) {
    var d = [];
    for (var i = 0; i < o.perread_timestamp.length; i++) {
      d.push(new UgiDetailedPerReadData(new Date(o.perread_timestamp[i]),
                                        o.perread_frequency[i],
                                        o.perread_rssiI[i],
                                        o.perread_rssiQ[i],
                                        o.perread_readData1[i],
                                        o.perread_readData2[i]));
    }
    return d;
  } else {
    return null;
  }
};

/**
 * Stop running inventory
 */
UgiInventory.prototype.stopInventory = function(callback) {
  this.inStartInventory = false;
  exec(function(o) {
    if (callback) callback();
  }, null, "ugrokit", "stopInventory", [this.internalId]);
};

/**
 * Stop running inventory temporarily (such as while a dialog box is displayed)
 */
UgiInventory.prototype.pauseInventory = function() {
  argscheck.checkArgs("", "pauseInventory", arguments);
  this.isPaused = true;
  exec(null, null, "ugrokit", "pauseInventory", [this.internalId]);
};

/**
 * Restart inventory after a temporarily stop
 */
UgiInventory.prototype.resumeInventory = function() {
  argscheck.checkArgs("", "resumeInventory", arguments);
  this.isPaused = false;
  exec(null, null, "ugrokit", "resumeInventory", [this.internalId]);
};

/**
 * Values returned by programTag, writeTag, lockUnlockTag and readTag
 * @readonly
 * @enum {Number}
 */
UgiInventory.TagAccessReturnValues = {
  /** Access was successful */
  OK: 0,
  /** Incorrect password passed */
  WRONG_PASSWORD: 1,
  /** No password passed, but a password is required */
  PASSWORD_REQUIRED: 2,
  /** Read/write to a memory locaion that does not exist on tht tag */
  MEMORY_OVERRUN: 3,
  /** Tag not found */
  TAG_NOT_FOUND: 4,
  /** General error */
  GENERAL_ERROR: 5
};

/**
 * Tag does not need a password
 */
UgiInventory.NO_PASSWORD = 0;

/**
 * Program a tag.
 * This must be called while inventory is running.
 * The delegate object is informed of the success or failure of the programming.
 * @param oldEpc   EPC of tag to change (string of hex digits)
 * @param newEpc   EPC to write to the tag (string of hex digits)
 * @param password      Password to use (UGI_NO_PASSWORD for not password protected)
 * @param completion    Completion code after tag is written
 */
UgiInventory.prototype.programTag = function(oldEpc, newEpc, password, completion) {
  argscheck.checkArgs("ssnf", "programTag", arguments);
  var _this = this;
  exec(function(o) {
    completion(_this._tagFromObject(o), o.result);
  }, null, "ugrokit", "programTag", [this.internalId, oldEpc, newEpc, password]);
};

/**
 * Write memory.
 * This must be called while inventory is running. This method call returns immediately,
 * the completion is called when the operation is finished
 * @param epc           EPC of tag to write to (string of hex digits)
 * @param memoryBank    Memory bank to write to (Ugi.MemoryBanks.xxx)
 * @param offset        Byte offset to write at (must be a multiple of 2)
 * @param data          Data to write (hex string)
 * @param previousData  Previous value for this data (hex string), or null if unknown or not available
 * @param password      Password to use (UGI_NO_PASSWORD for not password protected)
 * @param completion    Completion code after tag is written
 */
UgiInventory.prototype.writeTag = function(epc, memoryBank, offset, data, previousData, password, completion) {
  argscheck.checkArgs("snns*nf", "writeTag", arguments);
  var _this = this;
  exec(function(o) {
    completion(_this._tagFromObject(o), o.result);
  }, null, "ugrokit", "writeTag", [this.internalId, epc, memoryBank, offset, data, previousData, password]);
};

/**
 * Definitions for value passed to lockUnlockTag choosing what banks to change the locked status for and what to change them to
 */
UgiInventory.LockUnlockMaskAndAction = {
  //
  // Masks -- these define which bits to change
  //
  KILL_PASSWORD_MASK_BIT_OFFSET: 18,   //!< Offset for mask bits for kill password
  ACCESS_PASSWORD_MASK_BIT_OFFSET: 16, //!< Offset for mask bits for access password
  EPC_MASK_BIT_OFFSET: 14,             //!< Offset for mask bits for EPC memory bank
  TID_MASK_BIT_OFFSET: 12,             //!< Offset for mask bits for TID memory bank
  USER_MASK_BIT_OFFSET: 10,            //!< Offset for mask bits for USER memory bank
  //
  // Actions -- these define what to change to
  //
  KILL_PASSWORD_ACTION_BIT_OFFSET: 8,     //!< Offset for action bits for kill password
  ACCESS_PASSWORD_ACTION_BIT_OFFSET: 6,   //!< Offset for action bits for access password
  EPC_ACTION_BIT_OFFSET: 4,               //!< Offset for action bits for EPC memory bank
  TID_ACTION_BIT_OFFSET: 2,               //!< Offset for action bits for TID memory bank
  USER_ACTION_BIT_OFFSET: 0,              //!< Offset for action bits for USER memory bank
  //
  // Access values
  //
  MASK_CHANGE_NONE: 0,                    //!< Mask: don't change
  MASK_CHANGE_PERMALOCK: 1,               //!< Mask: change permlock bit
  MASK_CHANGE_WRITABLE: 2,                //!< Mask: change writable bit
  MASK_CHANGE_WRITABLE_AND_PERMALOCK: 3,  //!< Mask: change permlock and writable bits
  //
  // Action values
  //
  ACTION_WRITABLE: 0,                     //!< Action: writable
  ACTION_PERMANENTLY_WRITABLE: 1,         //!< Action: permanently writable
  ACTION_WRITE_RESTRICTED: 2,             //!< Action: write restricted (password required)
  ACTION_PERMANENTLY_NOT_WRITABLE: 3     //!< Action: permanently not writable
};

/**
 Lock/unlock a tag
 
 This must be called while inventory is running. This method call returns immediately,
 the completion is called when the operation is finished
 
 @param epc           EPC of tag to lock/unlock
 @param maskAndAction Description for which protection bits to change and what to change them to (UgiLockUnlockMaskAndAction)
 @param password      Password to use (UGI_NO_PASSWORD for not password protected)
 @param completion    Completion code after tag is locked/unlocked
 */
UgiInventory.prototype.lockUnlockTag = function(epc, maskAndAction, password, completion) {
  argscheck.checkArgs("snnf", "lockUnlockTag", arguments);
  var _this = this;
  exec(function(o) {
    completion(_this._tagFromObject(o), o.result);
  }, null, "ugrokit", "lockUnlockTag", [this.internalId, epc, maskAndAction, password]);
};

/**
 Read a tag
 
 This must be called while inventory is running. This method call returns immediately,
 the completion is called when the operation is finished
 
 @param epc           EPC of tag to read
 @param memoryBank    Memory bank to read
 @param offset        Byte offset to read at (must be a multiple of 2)
 @param minNumBytes   Minimum number of bytes to read (must be a multiple of 2)
 @param maxNumBytes   Maximum number of bytes to read (must be a multiple of 2)
 @param completion    Completion code after tag is read
 */
UgiInventory.prototype.readTag = function(epc, memoryBank, offset, minNumBytes, maxNumBytes, completion) {
  argscheck.checkArgs("snnnnf", "readTag", arguments);
  var _this = this;
  exec(function(o) {
    completion(_this._tagFromObject(o), o.data, o.result);
  }, null, "ugrokit", "readTag", [this.internalId, epc, memoryBank, offset, minNumBytes, maxNumBytes]);
};

/**
 Send a custom command to a tag
 
 This must be called while inventory is running. This method call returns immediately,
 the completion is called when the operation is finished
 
 @param epc           EPC of tag to read
 @param command       Command bytes to send
 @param commandBits   Number of command bits to send
 @param responseBitLengthNoHeaderBit   Number of response bits to expect, if header bit
                                       is not set in the response
 @param responseBitLengthWithHeaderBit   Number of response bits to expect, if header bit is
                                         set in the response (if 0 then do not expect a header bit at all)
 @param receiveTimeoutUsec   Response timeout in uSec (some tags require more than the standard
                             for custom commands)
 @param completion    Completion code after the custom command is executed
 */
UgiInventory.prototype.customCommandToTag = function(epc, command, commandBits, responseBitLengthNoHeaderBit,
                                                    responseBitLengthWithHeaderBit, receiveTimeoutUsec, completion) {
  argscheck.checkArgs("ssnnnnf", "customCommandToTag", arguments);
  var _this = this;
  exec(function(o) {
    completion(_this._tagFromObject(o), o.headerBit, o.response, o.result);
  }, null, "ugrokit", "customCommandToTag", [this.internalId, epc, command, commandBits, responseBitLengthNoHeaderBit,
                                             responseBitLengthWithHeaderBit, receiveTimeoutUsec]);
};
               
/**
 Change power
 
 This must be called while inventory is running. This method call returns immediately,
 the completion is called when the operation is finished
 
 @param initialPowerLevel   Initial power level
 @param minPowerLevel       Minimum power level
 @param maxPowerLevel       Maximum power level
 @param completion    Completion code after the custom command is executed
 */
UgiInventory.prototype.changePower = function(initialPowerLevel, minPowerLevel, maxPowerLevel, completion) {
  argscheck.checkArgs("nnnf", "changePower", arguments);
  var _this = this;
  exec(function(o) {
    completion(o.success);
  }, null, "ugrokit", "changePower", [this.internalId, initialPowerLevel, minPowerLevel, maxPowerLevel]);
};

//------------------------------------
// Battery
//------------------------------------

/**
 * Get battery information
 * @param successCallback Called with one parameter of type UgiBatteryInfo
 */
UgiInventory.prototype.getBatteryInfo = function(successCallback) {
  argscheck.checkArgs("f", "getBatteryInfo", arguments);
  exec(successCallback, null, "ugrokit", "getBatteryInfo", []);
};

//------------------------------------

module.exports = UgiInventory;
