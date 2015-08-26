//
//  Ugi.h
//
//  Copyright (c) 2012 U Grok It. All rights reserved.
//

#define __UGI_H

#import <UIKit/UIKit.h>

#import "UgiConfigurationDelegate.h"
#import "UgiInventory.h"
#import "UgiRfidConfiguration.h"
#import "UgiEpc.h"
#import "UgiTag.h"
#import "UgiTagReadState.h"
#import "UgiInventoryDelegate.h"

/**
 Singleton class that implements the U Grok It API.
 
 The Ugi class is used as a singleton - only one instance of the class exists.
 
 The singleton object should be explicitly created by calling createSingleton.
 */
@interface Ugi : NSObject

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Lifecycle
///////////////////////////////////////////////////////////////////////////////////////

//! Delegate to handle configuration events.
@property (readonly) NSObject<UgiConfigurationDelegate> *configurationDelegate;

/**
 Create the singleton object with the default configuration handler,
 This is usually done in your application delegate's didFinishLaunchingWithOptions: method or in main.c
 */
+ (void) createSingleton;

/**
 Create the singleton object with a specific configuration handler
 This is usually done in your application delegate's didFinishLaunchingWithOptions: method or in main.c
*/
+ (void) createSingletonWithConfigurationDelegate:(NSObject<UgiConfigurationDelegate> *)configurationDelegate;

/////////////

/**
 Get the singleton object.
 
 @return The one and only Ugi object, through which the application accesses the API.
 */
+ (Ugi *) singleton;

/**
 Release the singleton object.
 
 Normally called in applicationWillTerminate
 */
+ (void) releaseSingleton;

/**
 See if the application has microphone permission.
 This always returns YES prior to iOS7
 @param completion Block called with permission status
 */
- (void) checkMicPermission:(void(^)(BOOL havePermission))completion;

/**
 Get the desired orientation (pre-iOS6)
 */
- (UIInterfaceOrientation) desiredInterfaceOrientation;
/**
 Get the preferred orientation (iOS6)
 */
- (UIInterfaceOrientationMask) desiredInterfaceOrientationMask;

///@name Connection

/**
 Try to open a connection to the reader.
 
 openConnection returns immediately, it does not wait for a connection to the reader
 to actually be established. If a reader is connected, the connection takes 400-500ms
 (just under half a second) for the connection sequence. Your app can get notification
 of connection state changes by registering with the default NotificationCenter with
 the name [Ugi singleton].NOTIFICAION_NAME_CONNECTION_STATE_CHANGED:
 @code
 [[NSNotificationCenter defaultCenter] addObserver:self
                                          selector:@selector(connectionStateChanged:)
                                              name:[Ugi singleton].NOTIFICAION_NAME_CONNECTION_STATE_CHANGED
                                            object:nil];
 @endcode
 
 This method is normally called in applicationDidBecomeActive but may be called
 elsewhere if the app does not want to always be connected to the reader.
 */
- (void) openConnection;

/**
 Close connection to the reader.
 
 This method is normally called in applicationWillTerminate.
 */
- (void) closeConnection;

///@}

///@name Connection Properties

//! Has openConnection has been called (without a corresponding call to closeConnecion)
@property (readonly, nonatomic) BOOL inOpenConnection;

//! Is anything is plugged into the audio jack (as best we can determine)
@property (readonly, nonatomic) BOOL isAnythingPluggedIntoAudioJack;

///@}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Connection state
///////////////////////////////////////////////////////////////////////////////////////

///@name Connection Types

/**
 States for the connection, sent with [Ugi singleton].NOTIFICAION_NAME_CONNECTION_STATE_CHANGED
 */
typedef enum {
  UGI_CONNECTION_STATE_NOT_CONNECTED,        //!< Nothing connected to audio port
  UGI_CONNECTION_STATE_CONNECTING,           //!< Something connected to audio port, trying to connect
  UGI_CONNECTION_STATE_INCOMPATIBLE_READER,  //!< Connected to an reader with incompatible firmware
  UGI_CONNECTION_STATE_CONNECTED             //!< Connected to reader
} UgiConnectionStates;

///@}

///@name Connection Properties

/**
 Notification of connection state changed is sent to default NSNotificationCenter. The object
 sent with the notification is an NSNumber containing the connection state.
 */
@property (readonly, nonatomic) NSString *NOTIFICAION_NAME_CONNECTION_STATE_CHANGED;
/**
 Notification of connection state changed is sent to default NSNotificationCenter. The object
 sent with the notification is an NSNumber containing the connection state.
 */
@property (readonly, nonatomic) NSString *NOTIFICAION_NAME_INVENTORY_STATE_CHANGED;

//! The current connection state
@property (readonly, nonatomic) UgiConnectionStates connectionState;

//! Whether the reader is connected (returns YES if connectionState == UGI_CONNECTION_STATE_CONNECTED)
@property (readonly, nonatomic) BOOL isConnected;

///@}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Inventory
///////////////////////////////////////////////////////////////////////////////////////

///@name Inventory

/**
 Start running inventory (if a reader is connected).
 
 If one or more EPCs are passed in, only they will be reported back to the delegate
 If no EPCs are passed (epcs=nil, numEpcs=0) then all EPCs will be reported back to the delegate

 If a small number of EPCs are passed (<=maxEpcsSentToReader), filtering is done on the
 reader and the reader plays sounds immediately (with no host interaction).
 Otherwise filtering is done on the host, and the host tells the reder when to play sounds
 which is slower.

 The inventory code keeps a history for each tag. This history is the number of finds for each
 time interval. The default is to store history for 20 intervals of 500ms each. This default can
 be modified via properties: historyIntervalMSec and historyDepth.
 
 @param delegate       Delegate object to report back to
 @param configuration  Configuration to use
 @param epcs           EPCs to find, all other EPCs are ignored (or nil to find all EPCs)
 @return               UgiInventory object that will hold the results of this inventory
 */
- (UgiInventory *) startInventory:(id<UgiInventoryDelegate>)delegate
                withConfiguration:(UgiRfidConfiguration*)configuration
                         withEpcs:(NSArray *)epcs;

/**
 Start running inventory (if a reader is connected).
 
 If one or more EPCs are passed in, ignore these EPCs
 
 @param delegate       Delegate object to report back to
 @param configuration  Configuration to use
 @param epcsToIgnore   EPCs to ignore
 @return               UgiInventory object that will hold the results of this inventory
 */
- (UgiInventory *) startInventoryIgnoringEpcs:(id<UgiInventoryDelegate>)delegate
                            withConfiguration:(UgiRfidConfiguration*)configuration
                             withEpcsToIgnore:(NSArray *)epcsToIgnore;

/**
 Start running inventory to find any tags
 
 @param delegate   Delegate object to report back to
 @param configuration  Configuration to use
 @return               UgiInventory object that will hold the results of this inventory
 */
- (UgiInventory *) startInventory:(id<UgiInventoryDelegate>)delegate
                withConfiguration:(UgiRfidConfiguration*)configuration;

/**
 Start running inventory to find one specific tag
 
 @param delegate   Delegate object to report back to
 @param configuration  Configuration to use
 @param epc            EPC to find, all other EPCs are ignored
 @return               UgiInventory object that will hold the results of this inventory
 */
- (UgiInventory *) startInventory:(id<UgiInventoryDelegate>)delegate
                withConfiguration:(UgiRfidConfiguration*)configuration
                          withEpc:(UgiEpc *)epc;

//! Get the currently active inventory object (if any)
@property (readonly, nonatomic) UgiInventory *activeInventory;

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Reader info
///////////////////////////////////////////////////////////////////////////////////////

///@name Reader Information Properties

//! Protocol version that the host requires
@property (readonly, nonatomic) int requiredProtocolVersion;

//! Protocol version that the host supports
@property (readonly, nonatomic) int supportedProtocolVersion;

//////////////

//
// These values are not valid until the reader is connected
//

//! Reader protocol version
@property (readonly, nonatomic) int readerProtocolVersion;

///@}

///@name Reader Information Types

/**
 Reader hardware type and version
 */
typedef enum {
  UGI_READER_HARDWARE_UNKNOWN,                  //!< Unknown
  UGI_READER_HARDWARE_GROKKER_1=5               //!< The original Grokker
} UgiReaderHardwareTypes;

///@}

///@name Reader Information Properties

//! Reader's model
@property (readonly, nonatomic) NSString *readerHardwareModel;

//! Reader's hardware type
@property (readonly, nonatomic) UgiReaderHardwareTypes readerHardwareType;
//! Reader's hardware type name
@property (readonly, nonatomic) NSString *readerHardwareTypeName;
//! Reader's hardware version
@property (readonly, nonatomic) int readerHardwareRevision;

//! Firmware version in the reader, major
@property (readonly, nonatomic) int firmwareVersionMajor;
//! Firmware version in the reader, minor
@property (readonly, nonatomic) int firmwareVersionMinor;
//! Firmware version in the reader, build
@property (readonly, nonatomic) int firmwareVersionBuild;

//! Reader's serial number
@property (readonly, nonatomic) int readerSerialNumber;

///@}

///@name Reader Information Properties

//! name of region of the world
@property (readonly, nonatomic) NSString *regionName;

//! Maximum number of tones in a sound
@property (readonly, nonatomic) int maxTonesInSound;

//! Maximum power that the reader can use
@property (readonly, nonatomic) double maxPower;

//! Maximum sensitivity
@property (readonly, nonatomic) int maxSensitivity;

//! Maximum number of volume levels
@property (readonly, nonatomic) int numVolumeLevels;

//! YES if the reader has battery power
@property (readonly, nonatomic) BOOL hasBattery;

//! YES if the reader has external power
@property (readonly, nonatomic) BOOL hasExternalPower;

//! YES if the user must choose the region of the world to operate in. If this is YES then the Grokker will not run inventory until the region is set.
@property (readonly, nonatomic) BOOL userMustSetRegion;

//! YES if the user can set the region (device attached and has sufficiently recent firmware).
@property (readonly, nonatomic) BOOL userCanSetRegion;

//! Battery capacity in minutes
@property (readonly, nonatomic) int batteryCapacity;

//! Battery capacity in mAh
@property (readonly, nonatomic) int batteryCapacity_mAh;

//! YES if device initialized successfully
@property (readonly, nonatomic) BOOL deviceInitializedSuccessfully;


//! Description of the reader, generally used for debugging
@property (readonly, nonatomic) NSString *readerDescription;

///@}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Reader Configuration: Sounds
///////////////////////////////////////////////////////////////////////////////////////

/**
 @public
 Geiger counter sound configuration, used by getGeigerCounterSound and setGeigerCounterSound
 */
typedef struct {
  int frequency;          //!< @public Frequency for each click (Hz)
  int durationMsec;       //!< @public Duration of each click, in milliseconds
  double clickRate;        //!< @public Ratio used for translating finds/second into clicks/second
  int maxClicksPerSecond; //!< @public Maximum number of clicks per second
  int historyDepthMsec;   //!< @public Number of history periods to consider for determining click rate
} UgiGeigerCounterSound;

///@name Configuration

/**
 Get the current geiger counter sound configuration
 
 This configuration is used if UGI_INVENTORY_SOUNDS_GEIGER_COUNTER is
 passed to startInventory

 @param config  Buffer to fill
 @return        YES if successful, NO if reader has never been connected)
 */
- (BOOL) getGeigerCounterSound:(UgiGeigerCounterSound *)config;

/**
 Set the geiger counter sound configuration
 
 This configuration is used if UGI_INVENTORY_SOUNDS_GEIGER_COUNTER is
 passed to startInventory
 
 If no reader is connected, the reader will be configured with these parameters
 after a connection is established. Similiarly, if the reader is disconnected and
 reconncted, these parameters will be configured with these parameters.
 
 @param config    Configuration parameters to set
 */
- (void) setGeigerCounterSound:(UgiGeigerCounterSound *)config;

///@}

/**
 @public
 A single tone, used by setFoundItemSound and setFoundLastItemSound
 */
typedef struct {
  int frequency;      //!< @public Frequency of tone (Hz)
  int durationMsec;   //!< @public Duration of tone, in milliseconds
} UgiSpeakerTone;

///@name Configuration

/**
 Get the current set of tones played when an item is found
 
 This sound is used if UGI_INVENTORY_SOUNDS_FIRST_FIND or
 UGI_INVENTORY_SOUNDS_FIRST_FIND_AND_LAST is passed to startInventory
 
 @return        A memory buffer containing an array of UgiSpeakerTone
                structures, ending in a structure with durationMsec==0.
                The caller must free() this bufffer.
                Returns NULL if a reader has never been connected
 */
- (UgiSpeakerTone *) getFoundItemSound;

/**
 Set the set of tones played when an item is found
 
 This sound is used if UGI_INVENTORY_SOUNDS_FIRST_FIND or
 UGI_INVENTORY_SOUNDS_FIRST_FIND_AND_LAST is passed to startInventory
 
 If no reader is connected, the reader will be configured with these parameters
 after a connection is established. Similiarly, if the reader is disconnected and
 reconncted, these parameters will be configured with these parameters.
 
 @param sound     Array of UgiSpeakerTone structures, ending in a
                  structure with durationMsec==0.
 */
- (void) setFoundItemSound:(UgiSpeakerTone *)sound;

/**
 Get the current set of tones played when the last item is found
 
 This sound is used if UGI_INVENTORY_SOUNDS_FIRST_FIND_AND_LAST
 is passed to startInventory
 
 @return        A memory buffer containing an array of UgiSpeakerTone
                structures, ending in a structure with durationMsec==0.
                The caller must free() this bufffer.
                Returns NULL if a reader has never been connected
 */
- (UgiSpeakerTone *) getFoundLastItemSound;

/**
 Set the set of tones played when the last item is found
 
 This sound is used if UGI_INVENTORY_SOUNDS_FIRST_FIND_AND_LAST
 is passed to startInventory
 
 If no reader is connected, the reader will be configured with these parameters
 after a connection is established. Similiarly, if the reader is disconnected and
 reconncted, these parameters will be configured with these parameters.
 
 @param sound     Array of UgiSpeakerTone structures, ending in a
                  structure with durationMsec==0.
 */
- (void) setFoundLastItemSound:(UgiSpeakerTone *)sound;

///@}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Diagnostic data
///////////////////////////////////////////////////////////////////////////////////////

/**
 @public
 Diagnostic data
 */
typedef struct {
	double byteProtocolSkewFactor;           //!< @public Factor the the reader's clock is off by
	int byteProtocolBytesSent;               //!< @public Bytes sent by reader
	int byteProtocolBytesReceived;           //!< @public Bytes received by reader
	int byteProtocolSubsequentReadTimeouts;  //!< @public Reader timeouts waiting for a next byte in a packet
	int packetProtocolPacketsSent;           //!< @public Packets sent by reader
	int packetProtocolPacketsReceived;       //!< @public Bytes received by reader
	int packetProtocolSendFailures;          //!< @public Reader failures sending a packet
	int packetProtocolSendRetries;           //!< @public Reader retries sending packets
	int packetProtocolSendTimeouts;          //!< @public Reader timeouts sending packets
	int packetProtocolInvalidPackets;        //!< @public Reader invalid packets received
	int packetProtocolInternalCrcMismatches; //!< @public Reader responses received with illegal enbedded CRCs
	int packetProtocolCrcMismatches;         //!< @public Reader packets received with wrong CRC
	int rawInventoryRounds;                  //!< @public Number of inventory rounds run
	int rawTagFinds;                         //!< @public Number of tag finds
	int inventoryUnique;                     //!< @public Number of unique tags found
	int inventoryForgotten;                  //!< @public Number of forgotten tags
	int inventoryForgottenNotAcknowledged;   //!< @public Number of forgotten tags not acknowledged by the host
	int inventoryForgottenNotSent;           //!< @public Number of forgotten tags not sent to the host
} UgiDiagnosticData;

///@name Diagnostic information

/**
 Get diagnostic data
 
 @param data            Buffer to fill
 @param reset           YES to reset counters
 @return        YES if successful, NO if reader has never been connected)
 */
- (BOOL) getDiagnosticData:(UgiDiagnosticData *)data
             resetCounters:(BOOL)reset;

///@}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Battery
///////////////////////////////////////////////////////////////////////////////////////

/**
 @public
 Battery data
 */
typedef struct {
  BOOL canScan;                     //!< @public YES if battery is capable of scanning
  BOOL externalPowerIsConnected;    //!< @public YES if external power is connected
  BOOL isCharging;                  //!< @public YES if battery is charging
	int minutesRemaining;             //!< @public Minutes of scanning remaining
  int percentRemaining;             //!< @public Percent of scanning time remaining. This is not very accurate while charging
  double voltage;                   //!< @public Battery voltage
} UgiBatteryInfo;

/**
 Get battery information. This cannot be called while scanning.
 
 @param retBatteryInfo            Structure to return information in
 @return                    YES if successful, NO if reader has never been connected)
 */
- (BOOL) getBatteryInfo:(UgiBatteryInfo *)retBatteryInfo;

/////////////

//
// Alternative version for Xamarin Wrapper
//
//! @cond
- (NSArray *) getBatteryInfoArray;
//! @endcond

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Misc
///////////////////////////////////////////////////////////////////////////////////////

//! @cond
/**
 Sounds playable on the reader via playSound
 */
typedef enum {
  UGI_PLAY_SOUND_FOUND_LAST     //!< The "last item found" sound
} UgiPlaySoundSoundTypes;

/**
 Play a sound on the reader
 
 @param sound   Sound to play
 */
- (void) playSound:(UgiPlaySoundSoundTypes)sound;
//! @endcond

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Logging
///////////////////////////////////////////////////////////////////////////////////////

///@name Logging Types

/**
 Types of logging.
 
 The default is no logging. The internal logging types are primarily for debugging
 of the API itself.
 */
typedef enum {
  UGI_LOGGING_INTERNAL_BYTE_PROTOCOL = 0x1,     //!< Lowest level communication protocol:
                                                //!< connection handshaking and byte send/receive
  UGI_LOGGING_INTERNAL_CONNECTION_ERRORS = 0x2, //!< Low level communication errors
  UGI_LOGGING_INTERNAL_CONNECTION_STATE = 0x4,  //!< Low level connection state changes 
  UGI_LOGGING_INTERNAL_PACKET_PROTOCOL = 0x8,   //!< Packet send/receive
  UGI_LOGGING_INTERNAL_COMMAND = 0x10,          //!< Command send/receive
  UGI_LOGGING_INTERNAL_INVENTORY = 0x20,        //!< Low-level inventory
  UGI_LOGGING_INTERNAL_FIRMWARE_UPDATE = 0x40,  //!< Low-level firmware update
  
  UGI_LOGGING_STATE = 0x1000,             //!< Connection and inventory state
  UGI_LOGGING_INVENTORY = 0x2000,         //!< Inventory activity
  UGI_LOGGING_INVENTORY_DETAIL = 0x4000   //!< Inventory details
} UgiLoggingTypes;

//! Function prototype for custom logging destination
typedef void LoggingDestination(NSString *s, NSObject *param);

///@}

///@name Logging Properties

/**
 The current logging status
 */
@property (nonatomic) UgiLoggingTypes loggingStatus;

/**
 If YES, add a timestamp to each logging line (default = NO)
 */
@property (nonatomic) BOOL loggingTimestamp;

/**
 Set the logging destination

 By default logging goes to NSLog()
 @param loggingDestination   Desitination (fuction) to send logging output to
 @param param                Opaque callback parameter
 */
- (void) setLoggingDestination:(LoggingDestination *)loggingDestination
                     withParam:(NSObject *)param;

///@}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - SDK version
///////////////////////////////////////////////////////////////////////////////////////

///@name SDK Version Properties

/**
 SDK Version, major
 
 SDK versions before 1.0.2 are no longer supported<br>
 <br>
 Version 1.0.2 - March 17, 2014 - Reader protocol 11<br>
   Minor bug fixes<br>
   Custom commands<br>
 <br>
 Version 1.1.1 - April 25, 2014 - Reader protocol 13<br>
   Change UGI_MIN_EPC_LENGTH from 8 to 4<br>
   Tweak settings for INVENTORY_DISTANCE<br>
 <br>
 Version 1.2.1 - July 7, 2014 - Reader protocol 14<br>
   Production Grokker compatibility<br>
   Changing power during inventory<br>
 <br>
 Version 1.3.1 - August 2, 2014 - Reader protocol 16<br>
   More options for SELECT before inventory<br>
   Improved device compatibility<br>
   Optional data reading on every tag read<br>
 <br>
 Version 1.3.2 - August 26, 2014 - Reader protocol 17<br>
   XCode 6 and iOS 8 compatibility<br>
 <br>
 Version 1.4.1 - September 10, 2014 - Reader protocol 17<br>
   RFID configuration changes<br>
   Bug fixes<br>
 <br>
   Version 1.5.1 - October 30, 2014 - Reader protocol 19<br>
   Bug fixes and performance improvements<br>
 <br>
   Version 1.6.1 - December 18, 2014 - Reader protocol 19<br>
   EU Grokker support (region setting)<br>
 <br>
   Version 1.7.2 - February 5, 2015 - Reader protocol 19<br>
   Streamlined UI for housekeeping tasks (set region and firmware update): added UgiConfigurationDelegate and UgiDefaultConfigurationUi<br>
 <br>
   Version 1.7.3 - February 11, 2015 - Reader protocol 19<br>
   Bug fix for app inactive/active while inventory is running<br>
 <br>
   Version 1.7.5 - March 9, 2015 - Reader protocol 19<br>
   Bug fix for passing both a select mask and EPCs to startInventory<br>
 <br>
   Version 1.7.6 - March 26, 2015 - Reader protocol 19<br>
   Better handling of protocol errors while starting/stopping inventory<br>
 <br>
   Version 1.7.7 - April 8, 2015 - Reader protocol 19<br>
   Minor bug fixes with setting region<br>
 <br>
   Version 1.7.8 - April 25, 2015 - Reader protocol 19<br>
   Bug fix for intermittent issue with pausing/resuming connection<br>
 <br>
   Version 1.7.13 - July 9, 2015 - Reader protocol 20<br>
   Updated Australia region information<br>
   Do not allow getting battery level during firmware update<br>
 <br>
   Version 1.7.16 - August 15, 2015 - Reader protocol 20<br>
   Fix crashing bug in SetRegion if no region selected
 */
@property (readonly, nonatomic) int sdkVersionMajor;
//! SDK Version, minor
@property (readonly, nonatomic) int sdkVersionMinor;
//! SDK Version, minor
@property (readonly, nonatomic) int sdkVersionBuild;
//! SDK Version, date/time
@property (readonly, nonatomic) NSDate *sdkVersionDateTime;

///@}

@end
