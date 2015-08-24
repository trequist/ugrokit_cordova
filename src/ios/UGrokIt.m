//
//  ugrokit.m
//
//  Cordova plug-in implemetation
//
//  Copyright (c) 2012 U Grok It. All rights reserved.
//
#import "ugrokit.h"

#import "Ugi.h"
#import "Ugi_regions.h"
#import "Ugi_firmwareUpdate.h"
#import "UgiUtil.h"

#import <objc/runtime.h>

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark -
#pragma mark Private
///////////////////////////////////////////////////////////////////////////////////////

@interface ugrokit ()

@property (nonatomic, retain) NSMutableDictionary *inventoryInfos;

@property (nonatomic, retain) NSMutableDictionary *connectionStateCallbacks;

@property (nonatomic, retain) NSString *firmwareCallbackId;

@end

static BOOL handleScreenRotation = YES;

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Categoty for UIViewController
///////////////////////////////////////////////////////////////////////////////////////

@interface UIViewController (hack)

- (BOOL)ugi_shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation;
- (NSUInteger)ugi_supportedInterfaceOrientations;

@end

///

@implementation UIViewController (hack)

// pre iOS 6
- (BOOL)ugi_shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation {
  if (handleScreenRotation) {
    UIInterfaceOrientation desiredOrientation = [[Ugi singleton] desiredInterfaceOrientation];
    return interfaceOrientation == desiredOrientation;
  } else {
    return [self ugi_shouldAutorotateToInterfaceOrientation:interfaceOrientation];
  }
}
// iOS 6
- (NSUInteger)ugi_supportedInterfaceOrientations {
  if (handleScreenRotation) {
    return [[Ugi singleton] desiredInterfaceOrientationMask];
  } else {
    return [self ugi_supportedInterfaceOrientations];
  }
}

@end

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - InventoryInfo
///////////////////////////////////////////////////////////////////////////////////////

@interface InventoryInfo : NSObject<UgiInventoryDelegate>

@property (nonatomic, retain) ugrokit *theUgrokit;

@property (nonatomic, retain) NSString *idForMap;

@property (nonatomic, retain) NSString *inventoryCallbackId;

@property (retain, nonatomic) UgiInventory *inventory;

@property (nonatomic) BOOL handlesUgiInventoryTagChanged;
@property (nonatomic) BOOL handlesUgiInventoryTagFound;
@property (nonatomic) BOOL handlesUgiInventoryTagSubsequentFinds;
@property (nonatomic) BOOL handlesUgiInventoryHistoryInterval;

@end

@implementation InventoryInfo

+ (void) tagToJson:(NSMutableDictionary *)d tag:(UgiTag *)tag {
  if (tag) {
    d[@"tag_epc"] = tag.epc.toString;
    d[@"tag_firstRead"] = @([tag.firstRead timeIntervalSince1970] * 1000);
    if (tag.tidMemory) d[@"tag_tidMemory"] = [UgiUtil dataToString:tag.tidMemory];
    if (tag.userMemory) d[@"tag_userMemory"] = [UgiUtil dataToString:tag.userMemory];
    if (tag.reservedMemory) d[@"tag_reservedMemory"] = [UgiUtil dataToString:tag.reservedMemory];
    d[@"tag_isVisible"] = @(tag.isVisible);
    
    UgiTagReadState *readState = tag.readState;
    d[@"tag_totalReads"] = @(readState.totalReads);
    d[@"tag_mostRecentRead"] = @([readState.mostRecentRead timeIntervalSince1970] * 1000);
    d[@"tag_mostRecentRssiI"] = @(readState.mostRecentRssiI);
    d[@"tag_mostRecentRssiQ"] = @(readState.mostRecentRssiQ);
    if (readState.readHistory) {
      d[@"tag_readHistory"] = readState.readHistory;
    }
  }
}

+ (void) detailedTagReadsToJson:(NSMutableDictionary *)d details:(NSArray *)details {
  if (details) {
    NSMutableArray *timestamp = [NSMutableArray arrayWithCapacity:details.count];
    NSMutableArray *frequency = [NSMutableArray arrayWithCapacity:details.count];
    NSMutableArray *rssiI = [NSMutableArray arrayWithCapacity:details.count];
    NSMutableArray *rssiQ = [NSMutableArray arrayWithCapacity:details.count];
    NSMutableArray *readData1 = [NSMutableArray arrayWithCapacity:details.count];
    NSMutableArray *readData2 = [NSMutableArray arrayWithCapacity:details.count];
    for (UgiDetailedPerReadData *d in details) {
      [timestamp addObject:@([d.timestamp timeIntervalSince1970] * 1000)];
      [frequency addObject:@(d.frequency)];
      [rssiI addObject:@(d.rssiI)];
      [rssiQ addObject:@(d.rssiQ)];
      [readData1 addObject:@(d.readData1)];
      [readData2 addObject:@(d.readData2)];
    }
    d[@"perread_timestamp"] = timestamp;
    d[@"perread_frequency"] = frequency;
    d[@"perread_rssiI"] = rssiI;
    d[@"perread_rssiQ"] = rssiQ;
    d[@"readData1"] = readData1;
    d[@"readData2"] = readData2;
  }
}

- (void) inventoryDidStart {
  NSMutableDictionary *d = [NSMutableDictionary dictionary];
  d[@"_cb"] = @"didStart";
  CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
  [pluginResult setKeepCallbackAsBool:YES];
  [self.theUgrokit.commandDelegate sendPluginResult:pluginResult callbackId:self.inventoryCallbackId];
}

- (void) inventoryDidStopWithResult:(UgiInventoryCompletedReturnValues)result {
  NSMutableDictionary *d = [NSMutableDictionary dictionary];
  d[@"_cb"] = @"didStop";
  d[@"result"] = @(result);
  CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
  InventoryInfo *inventoryInfo = self.theUgrokit.inventoryInfos[self.idForMap];
  BOOL isFinalCall = !inventoryInfo.inventory.isPaused &&
                     (result != UGI_INVENTORY_COMPLETED_LOST_CONNECTION);
  [pluginResult setKeepCallbackAsBool:!isFinalCall];
  [self.theUgrokit.commandDelegate sendPluginResult:pluginResult callbackId:self.inventoryCallbackId];
  if (isFinalCall) {
    [self.theUgrokit.inventoryInfos removeObjectForKey:self.idForMap];
    self.idForMap = nil;
  }
}

- (void) inventoryTagChanged:(UgiTag *)tag isFirstFind:(BOOL)firstFind {
  if (self.handlesUgiInventoryTagChanged) {
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"_cb"] = @"tagChanged";
    d[@"firstFind"] = @(firstFind);
    [InventoryInfo tagToJson:d tag:tag];
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.theUgrokit.commandDelegate sendPluginResult:pluginResult callbackId:self.inventoryCallbackId];
  }
}

- (void) inventoryTagFound:(UgiTag *)tag
   withDetailedPerReadData:(NSArray *)detailedPerReadData {
  if (self.handlesUgiInventoryTagFound) {
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"_cb"] = @"tagFound";
    [InventoryInfo tagToJson:d tag:tag];
    [InventoryInfo detailedTagReadsToJson:d details:detailedPerReadData];
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.theUgrokit.commandDelegate sendPluginResult:pluginResult callbackId:self.inventoryCallbackId];
  }
}

- (void) inventoryTagSubsequentFinds:(UgiTag *)tag
                            numFinds:(int)num
             withDetailedPerReadData:(NSArray *)detailedPerReadData {
  if (self.handlesUgiInventoryTagSubsequentFinds) {
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"_cb"] = @"tagSubsequentFinds";
    d[@"count"] = @(num);
    [InventoryInfo tagToJson:d tag:tag];
    [InventoryInfo detailedTagReadsToJson:d details:detailedPerReadData];
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.theUgrokit.commandDelegate sendPluginResult:pluginResult callbackId:self.inventoryCallbackId];
  }
}

- (void) inventoryHistoryInterval {
  if (self.handlesUgiInventoryHistoryInterval) {
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"_cb"] = @"historyInterval";
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.theUgrokit.commandDelegate sendPluginResult:pluginResult callbackId:self.inventoryCallbackId];
  }
}

@end

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - implementation
///////////////////////////////////////////////////////////////////////////////////////

@implementation ugrokit

- (void)sendResultOk:(CDVInvokedUrlCommand*)command {
  CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
  [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

+ (NSObject *) optArg:(NSObject *)arg {
  return arg == [NSNull null] ? nil : arg;
}

+ (NSString *) optString:(NSObject *)arg {
  return arg == [NSNull null] ? nil : (NSString *)arg;
}

+ (BOOL) optBool:(NSObject *)arg {
  return arg == [NSNull null] ? NO : ((NSNumber *)arg).boolValue;
}

+ (int) optInt:(NSObject *)arg {
  return arg == [NSNull null] ? 0 : ((NSNumber *)arg).intValue;
}

+ (double) optDouble:(NSObject *)arg {
  return arg == [NSNull null] ? 0 : ((NSNumber *)arg).doubleValue;
}

+ (NSData *) optData:(NSObject *)arg {
  NSString *s = [ugrokit optString:arg];
  return s ? [UgiUtil stringToData:s] : nil;
}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Lifecycle
///////////////////////////////////////////////////////////////////////////////////////

//
// Called once the first time the plug-in is used
//
- (void) pluginInitialize {
  [Ugi createSingleton];
  self.connectionStateCallbacks = [NSMutableDictionary dictionary];
  self.inventoryInfos = [NSMutableDictionary dictionary];
  [super pluginInitialize];
  
  Method original = class_getInstanceMethod([CDVViewController class],
                                            @selector(shouldAutorotateToInterfaceOrientation:));
  Method replacement = class_getInstanceMethod([CDVViewController class],
                                               @selector(ugi_shouldAutorotateToInterfaceOrientation:));
  method_exchangeImplementations(original, replacement);

  original = class_getInstanceMethod([CDVViewController class],
                                            @selector(supportedInterfaceOrientations));
  replacement = class_getInstanceMethod([CDVViewController class],
                                               @selector(ugi_supportedInterfaceOrientations));
  method_exchangeImplementations(original, replacement);
}

//
// Called when the page reloads
//
- (void) onReset {
  if ([Ugi singleton].activeInventory) [[Ugi singleton].activeInventory stopInventory];
  if ([Ugi singleton].inOpenConnection) [[Ugi singleton] closeConnection];
  [super onReset];
}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Internal
///////////////////////////////////////////////////////////////////////////////////////

//
// Get a map of static properties,so they are available directly (without callbacks)
//
- (void)getSdkStaticInfo:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"sdkVersionMajor"] = @([Ugi singleton].sdkVersionMajor);
    d[@"sdkVersionMinor"] = @([Ugi singleton].sdkVersionMinor);
    d[@"sdkVersionBuild"] = @([Ugi singleton].sdkVersionBuild);
    NSDate *date = [Ugi singleton].sdkVersionDateTime;
    d[@"sdkVersionDateTime"] = @([date timeIntervalSince1970] * 1000);
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];
}

//
// Get a map of static properties,so they are available directly (without callbacks)
//
- (void)getRfidConfigs:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSMutableArray *a = [NSMutableArray array];
    NSMutableArray *names = [NSMutableArray array];
    for (int i = UGI_INVENTORY_TYPE_LOCATE_DISTANCE; i <= UGI_INVENTORY_TYPE_LOCATE_VERY_SHORT_RANGE; i++) {
      UgiRfidConfiguration *config = [UgiRfidConfiguration configWithInventoryType:i];
      [a addObject:@(config.initialPowerLevel)];
      [a addObject:@(config.minPowerLevel)];
      [a addObject:@(config.maxPowerLevel)];
      [a addObject:@(config.initialQValue)];
      [a addObject:@(config.minQValue)];
      [a addObject:@(config.maxQValue)];
      [a addObject:@(config.session)];
      [a addObject:@(config.roundsWithNoFindsToToggleAB)];
      [a addObject:@(config.sensitivity)];
      [a addObject:@(config.powerLevelWrite)];
      [a addObject:@(config.sensitivityWrite)];
      [a addObject:@(config.setListenBeforeTalk)];
      [a addObject:@(config.listenBeforeTalk)];
      [a addObject:@(config.maxRoundsPerSecond)];
      [a addObject:@(config.minTidBytes)];
      [a addObject:@(config.maxTidBytes)];
      [a addObject:@(config.minUserBytes)];
      [a addObject:@(config.maxUserBytes)];
      [a addObject:@(config.minReservedBytes)];
      [a addObject:@(config.maxReservedBytes)];
      [a addObject:@(config.continual)];
      [a addObject:@(config.reportRssi)];
      [a addObject:@(config.detailedPerReadData)];
      [a addObject:@(config.reportSubsequentFinds)];
      [a addObject:@(config.soundType)];
      [a addObject:@(config.volume)];
      [a addObject:@(config.historyIntervalMSec)];
      [a addObject:@(config.historyDepth)];
      [a addObject:config.selectMask ? [UgiUtil dataToString:config.selectMask] : @""];
      [a addObject:@(config.selectMaskBitLength)];
      [a addObject:@(config.selectOffset)];
      [a addObject:@(config.selectBank)];
      [a addObject:@(config.detailedPerReadNumReads)];
      [a addObject:@(config.detailedPerReadMemoryBank1)];
      [a addObject:@(config.detailedPerReadWordOffset1)];
      [a addObject:@(config.detailedPerReadMemoryBank2)];
      [a addObject:@(config.detailedPerReadWordOffset2)];
      [names addObject:[UgiRfidConfiguration nameForInventoryType:i]];
    }
    NSArray *args = [NSArray arrayWithObjects:a, names, nil];
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK
                                                       messageAsArray:args];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];
}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Logging
///////////////////////////////////////////////////////////////////////////////////////

- (void)log:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSString *s = command.arguments[0];
    NSLog(@"%@", s);
    [self sendResultOk:command];
  }];
}

- (void)setLogging:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    int logging = ((NSNumber *)command.arguments[0]).intValue;
    [Ugi singleton].loggingStatus = logging;
    [self sendResultOk:command];
  }];
}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Connections
///////////////////////////////////////////////////////////////////////////////////////

- (void)openConnection:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    [[Ugi singleton] openConnection];
    [self sendResultOk:command];
  }];
}

- (void)closeConnection:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    [[Ugi singleton] closeConnection];
    [self sendResultOk:command];
  }];
}

- (void)addConnectionStateCallback:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSNumber *id = (NSNumber *)command.arguments[0];
    NSString *callbackId = command.callbackId;
    NSObject *observer = [[NSNotificationCenter defaultCenter] addObserverForName:[Ugi singleton].NOTIFICAION_NAME_CONNECTION_STATE_CHANGED object:nil queue:nil usingBlock:^(NSNotification *notification) {
      NSMutableDictionary *d = [NSMutableDictionary dictionary];
      d[@"state"] = notification.object;
      d[@"isAnythingPluggedIntoAudioJack"] = @([Ugi singleton].isAnythingPluggedIntoAudioJack);
      d[@"requiredProtocolVersion"] = @([Ugi singleton].requiredProtocolVersion);
      d[@"supportedProtocolVersion"] = @([Ugi singleton].supportedProtocolVersion);
      d[@"readerProtocolVersion"] = @([Ugi singleton].readerProtocolVersion);
      d[@"readerHardwareModel"] = [Ugi singleton].readerHardwareModel;
      d[@"readerSerialNumber"] = @([Ugi singleton].readerSerialNumber);
      d[@"firmwareVersion"] = [NSString stringWithFormat:@"%d.%d.%d", [Ugi singleton].firmwareVersionMajor, [Ugi singleton].firmwareVersionMinor, [Ugi singleton].firmwareVersionBuild];
      d[@"regionName"] = [Ugi singleton].regionName;
      d[@"numVolumeLevels"] = @([Ugi singleton].numVolumeLevels);
      d[@"batteryCapacity"] = @([Ugi singleton].batteryCapacity);
      d[@"batteryCapacity_mAh"] = @([Ugi singleton].batteryCapacity_mAh);
      d[@"readerDescription"] = [Ugi singleton].readerDescription;
      CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
      [pluginResult setKeepCallbackAsBool:YES];
      [self.commandDelegate sendPluginResult:pluginResult callbackId:callbackId];
    }];
    self.connectionStateCallbacks[id] = observer;
  }];
}

- (void)removeConnectionStateCallback:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSNumber *id = (NSNumber *)command.arguments[0];
    NSObject *observer = self.connectionStateCallbacks[id];
    [self.connectionStateCallbacks removeObjectForKey:id];
    [[NSNotificationCenter defaultCenter] removeObserver:observer];
  }];
}

- (void)setHandleScreenRotation:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    handleScreenRotation = [ugrokit optBool:command.arguments[0]];
  }];
}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Inventory
///////////////////////////////////////////////////////////////////////////////////////

- (void)startInventory:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    InventoryInfo *inventoryInfo = [[InventoryInfo alloc] init];
    NSString *idForMap = [ugrokit optString:command.arguments[0]];
    self.inventoryInfos[idForMap] = inventoryInfo;
    inventoryInfo.idForMap = idForMap;
    inventoryInfo.theUgrokit = self;
    inventoryInfo.inventoryCallbackId = command.callbackId;
    //
    // Config
    //
    UgiRfidConfiguration *config = [[UgiRfidConfiguration alloc] init];
    NSArray *values = (NSArray *)[ugrokit optArg:command.arguments[1]];
    config.initialPowerLevel = ((NSNumber *)values[0]).doubleValue;
    config.minPowerLevel = ((NSNumber *)values[1]).doubleValue;
    config.maxPowerLevel = ((NSNumber *)values[2]).doubleValue;
    config.initialQValue = ((NSNumber *)values[3]).intValue;
    config.minQValue = ((NSNumber *)values[4]).intValue;
    config.maxQValue = ((NSNumber *)values[5]).intValue;
    config.session = ((NSNumber *)values[6]).intValue;
    config.roundsWithNoFindsToToggleAB = ((NSNumber *)values[7]).intValue;
    config.sensitivity = ((NSNumber *)values[8]).doubleValue;
    config.powerLevelWrite = ((NSNumber *)values[9]).doubleValue;
    config.sensitivityWrite = ((NSNumber *)values[10]).doubleValue;
    config.setListenBeforeTalk = ((NSNumber *)values[11]).boolValue;
    config.listenBeforeTalk = ((NSNumber *)values[12]).boolValue;
    config.maxRoundsPerSecond = ((NSNumber *)values[13]).intValue;
    config.minTidBytes = ((NSNumber *)values[14]).intValue;
    config.maxTidBytes = ((NSNumber *)values[15]).intValue;
    config.minUserBytes = ((NSNumber *)values[16]).intValue;
    config.maxUserBytes = ((NSNumber *)values[17]).intValue;
    config.minReservedBytes = ((NSNumber *)values[18]).intValue;
    config.maxReservedBytes = ((NSNumber *)values[19]).intValue;
    config.continual = ((NSNumber *)values[20]).boolValue;
    config.reportRssi = ((NSNumber *)values[21]).boolValue;
    config.detailedPerReadData = ((NSNumber *)values[22]).boolValue;
    config.reportSubsequentFinds = ((NSNumber *)values[23]).boolValue;
    config.soundType = ((NSNumber *)values[24]).intValue;
    config.volume = ((NSNumber *)values[25]).doubleValue;
    config.historyIntervalMSec = ((NSNumber *)values[26]).intValue;
    config.historyDepth = ((NSNumber *)values[27]).intValue;
    NSString *maskString = (NSString *)values[28];
    if (maskString.length > 0) {
      uint8_t mask[MAX_RFID_CONFIGURATION_MASK_LENGTH_BYTES];
      int len = [UgiUtil stringToBytes:maskString toBuffer:mask bufferSize:UGI_MAX_EPC_LENGTH];
      config.selectMask = [NSData dataWithBytes:&mask length:len];
      config.selectMaskBitLength = ((NSNumber *)values[29]).intValue;
      if (config.selectMaskBitLength == 0) config.selectMaskBitLength = len*8;
      config.selectOffset = ((NSNumber *)values[30]).intValue;
      config.selectBank = ((NSNumber *)values[31]).intValue;
    } else {
      config.selectMask = nil;
      config.selectMaskBitLength = 0;
      config.selectOffset = 0;
      config.selectBank = UGI_MEMORY_BANK_EPC;
    }
    config.detailedPerReadNumReads = ((NSNumber *)values[32]).intValue;
    config.detailedPerReadMemoryBank1 = ((NSNumber *)values[33]).intValue;
    config.detailedPerReadWordOffset1 = ((NSNumber *)values[34]).intValue;
    config.detailedPerReadMemoryBank2 = ((NSNumber *)values[35]).intValue;
    config.detailedPerReadWordOffset2 = ((NSNumber *)values[36]).intValue;
    //
    // epcs
    //
    NSMutableArray *epcs = nil;
    NSArray *epcStrings = (NSArray *)[ugrokit optArg:command.arguments[2]];
    if (epcStrings) {
      epcs = [NSMutableArray array];
      for (NSString *epcString in epcStrings) {
        UgiEpc *epc = [UgiEpc epcFromString:epcString];
        if (epc) [epcs addObject:epc];
      }
      if (epcs.count == 0) epcs = nil;
    }
    BOOL epcsAreIgnoreList = [ugrokit optBool:command.arguments[3]];
    //
    // handlers
    //
    inventoryInfo.handlesUgiInventoryTagChanged = [ugrokit optBool:command.arguments[4]];
    inventoryInfo.handlesUgiInventoryTagFound = [ugrokit optBool:command.arguments[5]];
    inventoryInfo.handlesUgiInventoryTagSubsequentFinds = [ugrokit optBool:command.arguments[6]];
    inventoryInfo.handlesUgiInventoryHistoryInterval = [ugrokit optBool:command.arguments[7]];
    //
    // properties
    //
    if (epcs) {
      if (epcsAreIgnoreList) {
        inventoryInfo.inventory = [[Ugi singleton] startInventoryIgnoringEpcs:inventoryInfo
                                                            withConfiguration:config
                                                             withEpcsToIgnore:epcs];
      } else {
        inventoryInfo.inventory = [[Ugi singleton] startInventory:inventoryInfo
                                                withConfiguration:config
                                                         withEpcs:epcs];
      }
    } else {
      inventoryInfo.inventory = [[Ugi singleton] startInventory:inventoryInfo
                                              withConfiguration:config];
    }
  }];
}

/////

- (void)stopInventory:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSString *id = [ugrokit optString:command.arguments[0]];
    InventoryInfo *inventoryInfo = self.inventoryInfos[id];
    if (inventoryInfo) {
      [inventoryInfo.inventory stopInventoryWithCompletion:^{
        [self sendResultOk:command];
      }];
    } else {
      NSLog(@"ERROR: stopInventory cannot find active inventory");
    }
  }];
}

- (void)pauseInventory:(CDVInvokedUrlCommand*)command {
    NSString *id = [ugrokit optString:command.arguments[0]];
    InventoryInfo *inventoryInfo = self.inventoryInfos[id];
    if (inventoryInfo) {
      [inventoryInfo.inventory pauseInventory];
      [self sendResultOk:command];
    } else {
      NSLog(@"ERROR: pauseInventory cannot find active inventory");
    }
}

- (void)resumeInventory:(CDVInvokedUrlCommand*)command {
    NSString *id = [ugrokit optString:command.arguments[0]];
    InventoryInfo *inventoryInfo = self.inventoryInfos[id];
    if (inventoryInfo) {
      [inventoryInfo.inventory resumeInventory];
      [self sendResultOk:command];
    } else {
      NSLog(@"ERROR: resumeInventory cannot find active inventory");
    }
}

- (void)programTag:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSString *id = [ugrokit optString:command.arguments[0]];
    InventoryInfo *inventoryInfo = self.inventoryInfos[id];
    if (inventoryInfo) {
      NSString *oldEpcString = [ugrokit optString:command.arguments[1]];
      UgiEpc *oldEpc = [UgiEpc epcFromString:oldEpcString];
      NSString *newEpcString = [ugrokit optString:command.arguments[2]];
      UgiEpc *newEpc = [UgiEpc epcFromString:newEpcString];
      int password = [ugrokit optInt:command.arguments[3]];
      [inventoryInfo.inventory programTag:oldEpc
                                    toEpc:newEpc withPassword:password
                            whenCompleted:^(UgiTag *tag, UgiTagAccessReturnValues result) {
                              NSMutableDictionary *d = [NSMutableDictionary dictionary];
                              d[@"result"] = @(result);
                              [InventoryInfo tagToJson:d tag:tag];
                              CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
                              [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
                            }];
    } else {
      NSLog(@"ERROR: programTag cannot find active inventory");
    }
  }];
}

- (void)writeTag:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSString *id = [ugrokit optString:command.arguments[0]];
    InventoryInfo *inventoryInfo = self.inventoryInfos[id];
    if (inventoryInfo) {
      NSString *epcString = [ugrokit optString:command.arguments[1]];
      UgiEpc *epc = [UgiEpc epcFromString:epcString];
      int memoryBank = [ugrokit optInt:command.arguments[2]];
      int offset = [ugrokit optInt:command.arguments[3]];
      NSData *data = [ugrokit optData:command.arguments[4]];
      NSData *previousData = [ugrokit optData:command.arguments[5]];
      int password = [ugrokit optInt:command.arguments[6]];
      [inventoryInfo.inventory writeTag:epc
                             memoryBank:memoryBank
                                 offset:offset
                                   data:data previousData:previousData
                           withPassword:password
                          whenCompleted:^(UgiTag *tag, UgiTagAccessReturnValues result) {
                            NSMutableDictionary *d = [NSMutableDictionary dictionary];
                            d[@"result"] = @(result);
                            [InventoryInfo tagToJson:d tag:tag];
                            CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
                            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
                          }];
    } else {
      NSLog(@"ERROR: writeTag cannot find active inventory");
    }
  }];
}

- (void)lockUnlockTag:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSString *id = [ugrokit optString:command.arguments[0]];
    InventoryInfo *inventoryInfo = self.inventoryInfos[id];
    if (inventoryInfo) {
      NSString *epcString = [ugrokit optString:command.arguments[1]];
      UgiEpc *epc = [UgiEpc epcFromString:epcString];
      int maskAndAction = [ugrokit optInt:command.arguments[2]];
      int password = [ugrokit optInt:command.arguments[3]];
      [inventoryInfo.inventory lockUnlockTag:epc
                               maskAndAction:maskAndAction
                                withPassword:password
                               whenCompleted:^(UgiTag *tag, UgiTagAccessReturnValues result) {
                                 NSMutableDictionary *d = [NSMutableDictionary dictionary];
                                 d[@"result"] = @(result);
                                 [InventoryInfo tagToJson:d tag:tag];
                                 CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
                                 [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
                               }];
    } else {
      NSLog(@"ERROR: lockUnlockTag cannot find active inventory");
    }
  }];
}

- (void)readTag:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSString *id = [ugrokit optString:command.arguments[0]];
    InventoryInfo *inventoryInfo = self.inventoryInfos[id];
    if (inventoryInfo) {
      NSString *epcString = [ugrokit optString:command.arguments[1]];
      UgiEpc *epc = [UgiEpc epcFromString:epcString];
      int memoryBank = [ugrokit optInt:command.arguments[2]];
      int offset = [ugrokit optInt:command.arguments[3]];
      int minNumBytes = [ugrokit optInt:command.arguments[4]];
      int maxNumBytes = [ugrokit optInt:command.arguments[5]];
      [inventoryInfo.inventory readTag:epc
                            memoryBank:memoryBank
                                offset:offset
                           minNumBytes:minNumBytes
                           maxNumBytes:maxNumBytes
                         whenCompleted:^(UgiTag *tag, NSData *data, UgiTagAccessReturnValues result) {
                           NSMutableDictionary *d = [NSMutableDictionary dictionary];
                           d[@"result"] = @(result);
                           d[@"data"] = [UgiUtil dataToString:data];
                           [InventoryInfo tagToJson:d tag:tag];
                           CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
                           [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
                         }];
    } else {
      NSLog(@"ERROR: readTag cannot find active inventory");
    }
  }];
}

- (void)customCommandToTag:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSString *id = [ugrokit optString:command.arguments[0]];
    InventoryInfo *inventoryInfo = self.inventoryInfos[id];
    if (inventoryInfo) {
      NSString *epcString = [ugrokit optString:command.arguments[1]];
      UgiEpc *epc = [UgiEpc epcFromString:epcString];
      NSString *commandString = [ugrokit optString:command.arguments[2]];
      NSData *commandBytes = [UgiUtil stringToData:commandString];
      int commandBits = [ugrokit optInt:command.arguments[3]];
      int responseBitLengthNoHeaderBit = [ugrokit optInt:command.arguments[4]];
      int responseBitLengthWithHeaderBit = [ugrokit optInt:command.arguments[5]];
      int receiveTimeoutUsec = [ugrokit optInt:command.arguments[6]];
      [inventoryInfo.inventory customCommandToTag:epc
                                          command:commandBytes
                                      commandBits:commandBits
                     responseBitLengthNoHeaderBit:responseBitLengthNoHeaderBit
                   responseBitLengthWithHeaderBit:responseBitLengthWithHeaderBit
                               receiveTimeoutUsec:receiveTimeoutUsec
                                    whenCompleted:^(UgiTag *tag, BOOL headerBit, NSData *response, UgiTagAccessReturnValues result) {
                                      NSMutableDictionary *d = [NSMutableDictionary dictionary];
                                      d[@"result"] = @(result);
                                      d[@"headerBit"] = @(headerBit);
                                      d[@"response"] = [UgiUtil dataToString:response];
                                      [InventoryInfo tagToJson:d tag:tag];
                                      CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
                                      [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
                                    }];
    } else {
      NSLog(@"ERROR: customCommandToTag cannot find active inventory");
    }
  }];
}

- (void)changePower:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSString *id = [ugrokit optString:command.arguments[0]];
    InventoryInfo *inventoryInfo = self.inventoryInfos[id];
    if (inventoryInfo) {
      double initialPowerLevel = [ugrokit optDouble:command.arguments[1]];
      double minPowerLevel = [ugrokit optDouble:command.arguments[2]];
      double maxPowerLevel = [ugrokit optDouble:command.arguments[3]];
      [inventoryInfo.inventory changePowerInitial:initialPowerLevel
                                              min:minPowerLevel
                                              max:maxPowerLevel
                                    whenCompleted:^(BOOL success) {
                                      NSMutableDictionary *d = [NSMutableDictionary dictionary];
                                      d[@"success"] = @(success);
                                      CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
                                      [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
                                    }];
    } else {
      NSLog(@"ERROR: changePower cannot find active inventory");
    }
  }];
}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Battery
///////////////////////////////////////////////////////////////////////////////////////

- (void)getBatteryInfo:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    UgiBatteryInfo info;
    [[Ugi singleton] getBatteryInfo:&info];
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"canScan"] = @(info.canScan);
    d[@"externalPowerIsConnected"] = @(info.externalPowerIsConnected);
    d[@"isCharging"] = @(info.isCharging);
    d[@"minutesRemaining"] = @(info.minutesRemaining);
    d[@"percentRemaining"] = @(info.percentRemaining);
    d[@"voltage"] = @(info.voltage);
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];
}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Firmware update
///////////////////////////////////////////////////////////////////////////////////////

- (void)automaticCheckForFirmwareUpdate:(CDVInvokedUrlCommand*)command {
  [[Ugi singleton] automaticCheckForFirmwareUpdate:[Ugi singleton].FIRMWARE_CHANNEL_RELEASE
   withCompletion:^(UgiFirmwareUpdateInfo *info, BOOL required) {
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"required"] = @(required);
    if (info) {
      d[@"name"] = info.name;
      d[@"notes"] = info.notes;
      d[@"softwareVersionMajor"] = @(info.softwareVersionMajor);
      d[@"softwareVersionMinor"] = @(info.softwareVersionMinor);
      d[@"softwareVersionBuild"] = @(info.softwareVersionBuild);
      d[@"sofwareVersionDate"] = @([info.sofwareVersionDate timeIntervalSince1970] * 1000);
    }
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];
}

- (void)loadUpdateWithName:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSString *name = [ugrokit optString:command.arguments[0]];
    [[Ugi singleton] loadUpdateWithName:name
                         withCompletion:^(NSError *error) {
      NSMutableDictionary *d = [NSMutableDictionary dictionary];
      d[@"success"] = @(error == nil);
      CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
      [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
  }];
}

- (void)firmwareUpdate:(CDVInvokedUrlCommand*)command {
  self.firmwareCallbackId = command.callbackId;
  [[Ugi singleton] firmwareUpdate:self];
}

- (void)forceFirmwareChannelReload:(CDVInvokedUrlCommand*)command {
  BOOL onlyIfSomeTimeHasPassed = [ugrokit optBool:command.arguments[0]];
  [[Ugi singleton] forceFirmwareChannelReload:onlyIfSomeTimeHasPassed];
}

- (void)forceFirmwareGrokkerCheck:(CDVInvokedUrlCommand*)command {
  [[Ugi singleton] forceFirmwareGrokkerCheck];
}

- (void) firmwareUpdateProgress:(int)amountDone
                withAmountTotal:(int)amountTotal
                      canCancel:(BOOL)canCancel {
  NSMutableDictionary *d = [NSMutableDictionary dictionary];
  d[@"amountDone"] = @(amountDone);
  d[@"amountTotal"] = @(amountTotal);
  d[@"canCancel"] = @(canCancel);
  CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
  [pluginResult setKeepCallbackAsBool:YES];
  [self.commandDelegate sendPluginResult:pluginResult callbackId:self.firmwareCallbackId];
}

- (void) firmwareUpdateCompleted:(UgiFirmwareUpdateReturnValues)result
                      updateTime:(int)seconds {
  NSMutableDictionary *d = [NSMutableDictionary dictionary];
  d[@"success"] = @(result == UGI_FIRMWARE_UPDATE_SUCCESS);
  d[@"seconds"] = @(seconds);
  CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
  [self.commandDelegate sendPluginResult:pluginResult callbackId:self.firmwareCallbackId];
}

///////////////////////////////////////////////////////////////////////////////////////
#pragma mark - Region
///////////////////////////////////////////////////////////////////////////////////////

- (void)userMustSetRegion:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"value"] = @([Ugi singleton].userMustSetRegion);
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];
}

- (void)userCanSetRegion:(CDVInvokedUrlCommand*)command {
  [self.commandDelegate runInBackground:^{
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"value"] = @([Ugi singleton].userCanSetRegion);
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];
}

- (void)getRegionNames:(CDVInvokedUrlCommand*)command {
  [[Ugi singleton] getRegionNames:^(NSArray *regionNames, int selectedIndex, NSError *error) {
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    if (regionNames) d[@"regionNames"] = regionNames;
    d[@"selectedIndex"] = @(selectedIndex);
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];
}

- (void)setRegion:(CDVInvokedUrlCommand*)command {
  NSString *regionName = [ugrokit optString:command.arguments[0]];
  [[Ugi singleton] setRegion:regionName withCompletion:^(BOOL success) {
    NSMutableDictionary *d = [NSMutableDictionary dictionary];
    d[@"success"] = @(success);
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:d];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
  }];
}

@end
