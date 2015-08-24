/**
 * @class Data for each tag read, sent if detailedPerReadData is YES in the RFID configuration.
 * @readonly
 */ 
function UgiDetailedPerReadData(timestamp, frequency, rssiI, rssiQ, readData1, readData2) {
  /**
   * When the find happened
   * @type {Date}
   * @readonly
   */
  this.timestamp = timestamp;
  /**
   * Frequency the find happened at
   * @type {Number}
   * @readonly
   */
  this.frequency = frequency;
  /**
   * RSSI, I channel
   * @type {Number}
   * @readonly
   */
  this.rssiI = rssiI;
  /**
   * RSSI, Q channel
   * @type {Number}
   * @readonly
   */
  this.rssiQ = rssiQ;
  /**
   * First word read, if any
   * @type {Number}
   * @readonly
   */
  this.readData1 = readData1;
  /**
   * First word read, if any
   * @type {Number}
   * @readonly
   */
  this.readData2 = readData2;
}

//
// Stringify
//
UgiDetailedPerReadData.prototype.toString = function() {
  return "[" + (new Date().getTime() - this.timestamp.getTime()) + " ms ago, " + this.frequency + " Hz, " + this.rssiI + "/" + this.rssiQ + "]";
};

//------------------------------------
 
module.exports = UgiDetailedPerReadData;
