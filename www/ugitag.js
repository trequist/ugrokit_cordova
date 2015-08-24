/**
 * Creates a new instance UgiTag given an internal object.
 * @class Encapsulation of an RFID tag. Objects of this type are returned
 *        when tags are found.
 * @readonly
 * @param {Object} o Internal object
 */ 
function UgiTag(o) {
  /**
   * The tag's EPC, as a string of hex bytes
   * @type {String}
   * @readonly
   */
  this.epc = o.tag_epc;
  
  /**
   * When the tag was first read
   * @type {Date}
   * @readonly
   */
  this.firstRead = new Date(o.tag_firstRead);
  
  /**
   * Tag's TID memory, if we have read it, as a string of hex bytes
   * @type {String}
   * @readonly
   */
  this.tidMemory = o.tag_tidMemory;

  /**
   * Tag's USER memory, if we have read it, as a string of hex bytes
   * @type {String}
   * @readonly
   */
  this.userMemory = o.tag_userMemory;

  /**
   * Tag's RESERVED memory, if we have read it, as a string of hex bytes
   * @type {String}
   * @readonly
   */
  this.reservedMemory = o.tag_reservedMemory;

  /**
   * Tag's momentary read state
   * @type {UgiTagReadState}
   * @readonly
   */
  this.readState = new UgiTagReadState(o, this);
}

/**
 * Get the read state at this moment in time
 * @return {UgiTagReadState}
 */
UgiTag.prototype.getReadState = function() {
  return
};

//
// Stringify
//
UgiTag.prototype.toString = function() {
  var s = "UgiTag: " + this.epc;
  if (this.tidMemory) s += ", TID: " + this.tidMemory;
  if (this.userMemory) s += ", USER: " + this.userMemory;
  if (this.reservedMemory) s += ", RESERVED: " + this.reservedMemory;
  return s;
};

//------------------------------------
 
module.exports = UgiTag;
