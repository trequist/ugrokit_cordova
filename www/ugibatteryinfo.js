/**
 * @class This class encapsulates battery information from the Grokker
 */ 
function UgiBatteryInfo() {
  /** YES if battery is capable of scanning */
  this.canScan = false,
  /** YES if external power is connected */
  this.externalPowerIsConnected = false,
  /** YES if battery is charging */
  this.isCharging = false,
  /** Minutes of scanning remaining */
  this.minutesRemaining = 0,
  /** Percent of scanning time remaining */
  this.percentRemaining = 0,
  /** Battery voltage */
  this.voltage = 0
}

//------------------------------------

module.exports = UgiBatteryInfo;

