/**
 * Creates a new instance UgiTag given an internal object.
 * @class Encapsulation of an RFID tag. Objects of this type are returned
 *        when tags are found.
 * @readonly
 * @param {Object} o Internal object
 */ 
function UgiTagReadState(o, tag) {
  /**
   * Tag this read state is attached to
   * @type {UgiTag}
   * @readonly
   */
  this.tag = tag;
  /**
   * Total number of reads (since inventory started)
   * @type {Number}
   * @readonly
   */
  this.totalReads = o.tag_totalReads;
  /**
   * Most recent time the tag was first read
   * @type {Date}
   * @readonly
   */
  this.mostRecentRead = new Date(o.tag_mostRecentRead);
  /**
   * Most recent RSSI value, I channel
   * @type {Number}
   * @readonly
   */
  this.mostRecentRssiI = o.tag_mostRecentRssiI;
  /**
   * Most recent RSSI value, Q channel
   * @type {Number}
   * @readonly
   */
  this.mostRecentRssiQ = o.tag_mostRecentRssiQ;
  /**
   * Is the tag currently visible?
   * @type {Boolean}
   * @readonly
   */
  this.isVisible = o.tag_isVisible;
  /**
   * Read history
   * @type {Array|Number}
   * @readonly
   */
  this.readHistory = o.tag_readHistory;
}

/**
 * Get a string representing the read history of the tag, generally for debugging
 * @return {String}
 */
UgiTagReadState.prototype.getReadHistoryString = function() {
  if (this.isVisible) {
    var s = "";
    for (var i = 0; i < this.readHistory.length; i++) {
      var numReads = this.readHistory[i];
      s += (numReads == 0 ? '.' : (numReads < 10 ? String.fromCharCode("0".charCodeAt()+numReads) : '*'));
    }
    return s;
  } else {
    return "Not visible";
  }
};

//
// Stringify
//
UgiTagReadState.prototype.toString = function() {
  var s = "UgiTagReadState: " + this.tag + ": " + this.totalReads + " total reads, rssi: " + this.mostRecentRssiI + "/" + this.mostRecentRssiQ + ", history: " + this.getReadHistoryString();
  return s;
};

//------------------------------------
 
module.exports = UgiTagReadState;
