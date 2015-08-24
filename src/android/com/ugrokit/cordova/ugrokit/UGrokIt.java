/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with this
 * work for additional information regarding copyright ownership. The ASF
 * licenses this file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package com.ugrokit.cordova.ugrokit;

import java.util.*;

import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginResult.Status;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;

import com.ugrokit.api.*;

public class UGrokIt extends CordovaPlugin implements Ugi.FirmwareUpdateDelegate
{
  public static final String TAG = "UGrokIt";

  private static Ugi ugi;

  private CallbackContext firmwareCallbackContext;

  ///////////////////////////////////////////////////////////////////////////////////////
  // Utilities
  ///////////////////////////////////////////////////////////////////////////////////////

  private static void tagToJson(JSONObject d, UgiTag tag) throws JSONException {
    d.put("tag_epc", tag.getEpc().toString());
    d.put("tag_firstRead", tag.getFirstRead().getTime());
    d.put("tag_tidMemory", byteArrayToString(tag.getTidBytes()));
    d.put("tag_userMemory", byteArrayToString(tag.getUserBytes()));
    d.put("tag_reservedMemory", byteArrayToString(tag.getReservedBytes()));
    
    UgiTagReadState readState = tag.getTagReadState();
    d.put("tag_isVisible", readState.isVisible());
    d.put("tag_totalReads", readState.getTotalReads());
    d.put("tag_mostRecentRead", readState.getMostRecentRead().getTime());
    d.put("tag_mostRecentRssiI", readState.getMostRecentRssiI());
    d.put("tag_mostRecentRssiQ", readState.getMostRecentRssiQ());
    int[] ia = readState.getReadHistory();
    if (ia != null) {
      JSONArray numReads = new JSONArray();
      for (int i : ia) numReads.put(i);
      d.put("tag_readHistory", numReads);
    }
  }
  
  private static void detailsToJson(JSONObject d, UgiInventory.DetailedPerReadData details[]) throws JSONException {
    if (details != null) {
      JSONArray timestamp = new JSONArray();
      JSONArray frequency = new JSONArray();
      JSONArray rssiI = new JSONArray();
      JSONArray rssiQ = new JSONArray();
      JSONArray readData1 = new JSONArray();
      JSONArray readData2 = new JSONArray();
      for (UgiInventory.DetailedPerReadData detail : details) {
        timestamp.put(detail.getTimestamp().getTime());
        frequency.put(detail.getFrequency());
        rssiI.put(detail.getRssiI());
        rssiQ.put(detail.getRssiQ());
        readData1.put(detail.getReadData1());
        readData2.put(detail.getReadData2());
      }
      d.put("perread_timestamp", timestamp);
      d.put("perread_frequency", frequency);
      d.put("perread_rssiI", rssiI);
      d.put("perread_rssiQ", rssiQ);
      d.put("perread_readData1", readData1);
      d.put("perread_readData2", readData2);
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////
  // InventoryInfo
  ///////////////////////////////////////////////////////////////////////////////////////
  
  private class InventoryInfo implements UgiInventoryDelegate,
                                         UgiInventoryDelegate.InventoryHistoryIntervalListener,
                                         UgiInventoryDelegate.InventoryTagChangedListener,
                                         UgiInventoryDelegate.InventoryDidStartListener,
                                         UgiInventoryDelegate.InventoryDidStopListener,
                                         UgiInventoryDelegate.InventoryTagFoundListener,
                                         UgiInventoryDelegate.InventoryTagSubsequentFindsListener {
    String idForMap;
    CallbackContext inventoryCallbackContext;
    boolean handlesUgiInventoryTagChanged;
    boolean handlesUgiInventoryTagFound;
    boolean handlesUgiInventoryTagSubsequentFinds;
    boolean handlesUgiInventoryHistoryInterval;
    UgiInventory inventory;


    @Override
    public void inventoryDidStart() {
      try {
        JSONObject d = new JSONObject();
        d.put("_cb", "didStart");
        PluginResult pluginResult = new PluginResult(Status.OK, d);
        pluginResult.setKeepCallback(true);
        this.inventoryCallbackContext.sendPluginResult(pluginResult);
      } catch (JSONException ex) {
        Log.e(TAG, "inventoryDidStart", ex);
      }
    }

    @Override
    public void inventoryDidStop(int completedResult) {
      try {
        JSONObject d = new JSONObject();
        d.put("_cb", "didStop");
        d.put("result", completedResult);
        PluginResult pluginResult = new PluginResult(Status.OK, d);
        InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
        boolean isFinalCall = !inventoryInfo.inventory.isPaused() &&
                (completedResult != UGI_INVENTORY_COMPLETED_LOST_CONNECTION);
        pluginResult.setKeepCallback(!isFinalCall);
        this.inventoryCallbackContext.sendPluginResult(pluginResult);
        if (isFinalCall) {
          inventoryInfos.remove(this.idForMap);
          this.idForMap = null;
        }
      } catch (JSONException ex) {
        Log.e(TAG, "inventoryDidStop: " + completedResult, ex);
      }
    }

    @Override
    public void inventoryTagChanged(UgiTag tag, boolean firstFind) {
      if (handlesUgiInventoryTagChanged) {
        try {
          JSONObject d = new JSONObject();
          d.put("_cb", "tagChanged");
          d.put("firstFind", firstFind);
          tagToJson(d, tag);
          PluginResult pluginResult = new PluginResult(Status.OK, d);
          pluginResult.setKeepCallback(true);
          this.inventoryCallbackContext.sendPluginResult(pluginResult);
        } catch (JSONException ex) {
          Log.e(TAG, "inventoryTagChanged: " + tag, ex);
        }
      }
    }

    @Override
    public void inventoryTagFound(UgiTag tag, UgiInventory.DetailedPerReadData details[]) {
      if (handlesUgiInventoryTagFound) {
        try {
          JSONObject d = new JSONObject();
          d.put("_cb", "tagFound");
          tagToJson(d, tag);
          detailsToJson(d, details);
          PluginResult pluginResult = new PluginResult(Status.OK, d);
          pluginResult.setKeepCallback(true);
          this.inventoryCallbackContext.sendPluginResult(pluginResult);
        } catch (JSONException ex) {
          Log.e(TAG, "inventoryTagFound: " + tag, ex);
        }
      }
    }

    @Override
    public void inventoryTagSubsequentFinds(UgiTag tag, int count, UgiInventory.DetailedPerReadData details[]) {
      if (handlesUgiInventoryTagSubsequentFinds) {
        try {
          JSONObject d = new JSONObject();
          d.put("_cb", "tagSubsequentFinds");
          d.put("count", count);
          tagToJson(d, tag);
          detailsToJson(d, details);
          PluginResult pluginResult = new PluginResult(Status.OK, d);
          pluginResult.setKeepCallback(true);
          this.inventoryCallbackContext.sendPluginResult(pluginResult);
        } catch (JSONException ex) {
          Log.e(TAG, "inventoryTagSubsequentFinds: " + tag, ex);
        }
      }
    }

    @Override
    public void inventoryHistoryInterval() {
      if (handlesUgiInventoryHistoryInterval) {
        try {
          JSONObject d = new JSONObject();
          d.put("_cb", "historyInterval");
          PluginResult pluginResult = new PluginResult(Status.OK, d);
          pluginResult.setKeepCallback(true);
          this.inventoryCallbackContext.sendPluginResult(pluginResult);
        } catch (JSONException ex) {
          Log.e(TAG, "inventoryHistoryInterval", ex);
        }
      }
    }

  }

  ///////////////////////////////////////////////////////////////////////////////////////
  // Lifecycle
  ///////////////////////////////////////////////////////////////////////////////////////

  /**
   * Constructor.
   */
  public UGrokIt() {
  }

  /**
   * Sets the context of the Command. This can then be used to do things like
   * get file paths associated with the Activity.
   * 
   * @param cordova The context of the main Activity.
   * @param webView The CordovaWebView Cordova is running in.
   */
  @Override
  public void initialize(CordovaInterface cordova, CordovaWebView webView) {
    super.initialize(cordova, webView);
    ugi = Ugi.createSingleton(cordova.getActivity().getApplication());
    ugi.activityOnCreate(cordova.getActivity(), true);
    ugi.activityOnResume(cordova.getActivity());
  }

  private HashMap<Integer, OurConnectionStateListener> connectionStateMap = new HashMap<Integer, OurConnectionStateListener>();

  /**
   * Unregister receiver.
   */
  @Override
  public void onReset() {
    for (int id : connectionStateMap.keySet()) {
      OurConnectionStateListener listener = connectionStateMap.get(id);
      ugi.removeConnectionStateListener(listener);
    }
    connectionStateMap.clear();
    if (ugi.getActiveInventory() != null) ugi.getActiveInventory().stopInventory();
    if (ugi.isInOpenConnection()) ugi.closeConnection();
  }
  
  private Map<String, InventoryInfo> inventoryInfos = new HashMap<String, UGrokIt.InventoryInfo>();

  @Override
  public void onPause(boolean multitasking) {
    ugi.activityOnPause(cordova.getActivity());
    super.onPause(multitasking);
  }

  @Override
  public void onResume(boolean multitasking) {
    ugi.activityOnResume(cordova.getActivity());
    super.onResume(multitasking);
  }
  
  ///////////////////////////////////////////////////////////////////////////////////////
  // Main handler
  ///////////////////////////////////////////////////////////////////////////////////////

  /**
   * Executes the request and returns PluginResult.
   * 
   * @param action The action to execute.
   * @param args JSONArry of arguments for the plugin.
   * @param callbackContext The callback id used when calling back into
   *          JavaScript.
   * @return True if the action was valid, false if not.
   */
  @Override
  public boolean execute(String action,
                         JSONArray args,
                         CallbackContext callbackContext) {
	    final UGrokIt _this = this;
	    final String _action = action;
	    final JSONArray _args = args;
	    final CallbackContext _callbackContext = callbackContext;
	    cordova.getActivity().runOnUiThread(new Runnable() {
	        public void run() {
	        	try {
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    // Internal
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    if (_action.equals("getSdkStaticInfo")) {
	        	      //
	        	      // getSdkStaticInfo
	        	      //
	        	      JSONObject d = new JSONObject();
	        	      d.put("sdkVersionMajor", ugi.getSdkVersionMajor());
	        	      d.put("sdkVersionMinor", ugi.getSdkVersionMinor());
	        	      d.put("sdkVersionBuild", ugi.getSdkVersionBuild());
	        	      d.put("sdkVersionDateTime", ugi.getSdkVersionDateTime().getTime());
	        	      _callbackContext.success(d);
	        	    } else if (_action.equals("getRfidConfigs")) {
	        	      //
	        	      // getRfidConfigs
	        	      //
	        	      JSONArray a = new JSONArray();
	        	      JSONArray names = new JSONArray();
	        	      UgiRfidConfiguration[] configs = { UgiRfidConfiguration.LOCATE_DISTANCE, UgiRfidConfiguration.INVENTORY_SHORT_RANGE, UgiRfidConfiguration.INVENTORY_DISTANCE, UgiRfidConfiguration.LOCATE_SHORT_RANGE, UgiRfidConfiguration.LOCATE_VERY_SHORT_RANGE };
	        	      for (int i = 0; i < configs.length; i++) {
	        	        UgiRfidConfiguration config = configs[i];
	        	        a.put(config.getInitialPowerLevel());
	        	        a.put(config.getMinPowerLevel());
	        	        a.put(config.getMaxPowerLevel());
	        	        a.put(config.getInitialQValue());
	        	        a.put(config.getMinQValue());
	        	        a.put(config.getMaxQValue());
	        	        a.put(config.getSession());
	        	        a.put(config.getRoundsWithNoFindsToToggleAB());
	        	        a.put(config.getSensitivity());
	        	        a.put(config.getPowerLevelWrite());
	        	        a.put(config.getSensitivityWrite());
	        	        a.put(config.getSetListenBeforeTalk());
	        	        a.put(config.getListenBeforeTalk());
	        	        a.put(config.getMaxRoundsPerSecond());
	        	        a.put(config.getMinTidBytes());
	        	        a.put(config.getMaxTidBytes());
	        	        a.put(config.getMinUserBytes());
	        	        a.put(config.getMaxUserBytes());
	        	        a.put(config.getMinReservedBytes());
	        	        a.put(config.getMaxReservedBytes());
	        	        a.put(config.wantsContinual());
	        	        a.put(config.wantsReportRssi());
	        	        a.put(config.wantsDetailedPerReadData());
	        	        a.put(config.wantsReportSubsequentFinds());
	        	        a.put(config.getSoundType().ordinal());
	        	        a.put(config.getVolume());
	        	        a.put(config.getHistoryIntervalMSec());
	        	        a.put(config.getHistoryDepth());
	        	        byte[] mask = config.getSelectMask();
	        	        a.put(mask != null ? byteArrayToString(mask) : "");
	        	        a.put(config.getSelectMaskBitLength());
	        	        a.put(config.getSelectOffset());
	        	        a.put(config.getSelectBank().getInternalCode());
	        	        a.put(config.getDetailedPerReadNumReads());
	        	        a.put(config.getDetailedPerReadMemoryBank1().getInternalCode());
	        	        a.put(config.getDetailedPerReadWordOffset1());
	        	        a.put(config.getDetailedPerReadMemoryBank2().getInternalCode());
	        	        a.put(config.getDetailedPerReadWordOffset2());
	        	        names.put(UgiRfidConfiguration.getNameForInventoryType(i+1));
	        	      }
	        	      JSONArray ret = new JSONArray();
	        	      ret.put(a);
	        	      ret.put(names);
	        	      _callbackContext.success(ret);
	        	    }
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    // Logging
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    else if (_action.equals("log")) {
	        	      //
	        	      // log
	        	      //
	        	      Log.i(TAG, _args.getString(0));
	        	      _callbackContext.success();
	        	    } else if (_action.equals("setLogging")) {
	        	      //
	        	      // setLogging
	        	      //
	        	      int logging = _args.getInt(0);
	        	      ugi.setLoggingStatus(logging);
	        	      _callbackContext.success();
	        	    }
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    // Connections
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    else if (_action.equals("openConnection")) {
	        	      //
	        	      // openConnection
	        	      //
	        	      ugi.openConnection();
	        	      _callbackContext.success();
	        	    } else if (_action.equals("closeConnection")) {
	        	      //
	        	      // closeConnection
	        	      //
	        	      ugi.openConnection();
	        	      _callbackContext.success();
	        	    } else if (_action.equals("addConnectionStateCallback")) {
	        	      //
	        	      // addConnectionStateCallback (callback)
	        	      //
	        	      int id = _args.getInt(0);
	        	      OurConnectionStateListener listener = new OurConnectionStateListener(_callbackContext);
	        	      connectionStateMap.put(id, listener);
	        	      ugi.addConnectionStateListener(listener);
	        	    } else if (_action.equals("removeConnectionStateCallback")) {
	        	      //
	        	      // removeConnectionStateCallback (listenerId)
	        	      //
	        	      int id = _args.getInt(0);
	        	      OurConnectionStateListener listener = connectionStateMap.remove(id);
	        	      if (listener != null) {
	        	        ugi.removeConnectionStateListener(listener);
	        	      }
	        	      _callbackContext.success();
	        	    } else if (_action.equals("setHandleScreenRotation")) {
	        	      //
	        	      // setHandleScreenRotation (boolean)
	        	      //
	        	      boolean handleScreenRotation = _args.getBoolean(0);
	        	      ugi.activityUpdateHandleScreenRotation(cordova.getActivity(), handleScreenRotation);
	        	      _callbackContext.success();
	        	    }
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    // Inventory
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    else if (_action.equals("startInventory")) {
	        	      InventoryInfo inventoryInfo = new InventoryInfo();
	        	      String idForMap = _args.getString(0);
	        	      inventoryInfos.put(idForMap, inventoryInfo);
	        	      inventoryInfo.idForMap = idForMap;
	        	      inventoryInfo.inventoryCallbackContext = _callbackContext;
	        	      //
	        	      // config
	        	      //
	        	      JSONArray values = _args.getJSONArray(1);

	        	      byte[] selectMask = null;
	        	      int selectMaskBitLength = 0;
	        	      String maskString = values.getString(28);
	        	      if (maskString.length() > 0) {
	        	    	  selectMask = stringToByteArray(maskString);
	        	    	  selectMaskBitLength = values.getInt(29);
	        	    	  if (selectMaskBitLength == 0) {
	        	    		  selectMaskBitLength = selectMask.length * 8;
	        	          }    	  
	        	      }
	        	      UgiRfidConfiguration config = new UgiRfidConfiguration.Builder().withInitialPowerLevel(values.getDouble(0))
	        	                                                                      .withMinPowerLevel(values.getDouble(1))
	        	                                                                      .withMaxPowerLevel(values.getDouble(2))
	        	                                                                      .withInitialQValue(values.getInt(3))
	        	                                                                      .withMinQValue(values.getInt(4))
	        	                                                                      .withMaxQValue(values.getInt(5))
	        	                                                                      .withSession(values.getInt(6))
	        	                                                                      .withRoundsWithNoFindsToToggleAB(values.getInt(7))
	        	                                                                      .withSensitivity(values.getInt(8))
	        	                                                                      .withPowerLevelWrite(values.getDouble(9))
	        	                                                                      .withSensitivityWrite(values.getInt(10))
	        	                                                                      .withSetListenBeforeTalk(values.getBoolean(11))
	        	                                                                      .withListenBeforeTalk(values.getBoolean(12))
	        	                                                                      .withMaxRoundsPerSecond(values.getInt(13))
	        	                                                                      .withMinTidBytes(values.getInt(14))
	        	                                                                      .withMaxTidBytes(values.getInt(15))
	        	                                                                      .withMinUserBytes(values.getInt(16))
	        	                                                                      .withMaxUserBytes(values.getInt(17))
	        	                                                                      .withMinReservedBytes(values.getInt(18))
	        	                                                                      .withMaxReservedBytes(values.getInt(19))
	        	                                                                      .withContinual(values.getBoolean(20))
	        	                                                                      .withReportRssi(values.getBoolean(21))
	        	                                                                      .withDetailedPerReadData(values.getBoolean(22))
	        	                                                                      .withReportSubsequentFinds(values.getBoolean(23))
	        	                                                                      .withSoundType(UgiRfidConfiguration.SoundTypes.values()[values.getInt(24)])
	        	                                                                      .withVolume(values.getDouble(25))
	        	                                                                      .withHistoryIntervalMSec(values.getInt(26))
	        	                                                                      .withHistoryDepth(values.getInt(27))
	        	                                                                      .withSelectMask(selectMask)
	        	                                                                      .withSelectMaskBitLength(selectMaskBitLength)
	        	                                                                      .withSelectOffset(values.getInt(30))
	        	                                                                      .withSelectBank(UgiRfidConfiguration.MemoryBank.values()[values.getInt(31)])
	        	                                                                      .withDetailedPerReadNumReads(values.getInt(32))
	        	                                                                      .withDetailedPerReadMemoryBank1(UgiRfidConfiguration.MemoryBank.values()[values.getInt(33)])
	        	                                                                      .withDetailedPerReadWordOffset1(values.getInt(34))
	        	                                                                      .withDetailedPerReadMemoryBank2(UgiRfidConfiguration.MemoryBank.values()[values.getInt(35)])
	        	                                                                      .withDetailedPerReadWordOffset2(values.getInt(36))
	        	                                                                      .build();
	        	      //
	        	      // epcs
	        	      //
	        	      ArrayList<UgiEpc> epcs = null;
	        	      JSONArray ja = _args.optJSONArray(2);
	        	      if (ja != null) {
	        	        epcs = new ArrayList<UgiEpc>(ja.length());
	        	        for (int i = 0; i < ja.length(); i++) {
	        	          String s = ja.getString(i);
	        	          UgiEpc epc = new UgiEpc(s);
	        	          epcs.add(epc);
	        	        }
	        	      }
	        	      boolean epcsAreIgnoreList = _args.optBoolean(3);
	        	      //
	        	      // Booleans for whether certain handlers exist
	        	      //
	        	      inventoryInfo.handlesUgiInventoryTagChanged = _args.optBoolean(4);
	        	      inventoryInfo.handlesUgiInventoryTagFound = _args.optBoolean(5);
	        	      inventoryInfo.handlesUgiInventoryTagSubsequentFinds = _args.optBoolean(6);
	        	      inventoryInfo.handlesUgiInventoryHistoryInterval = _args.optBoolean(7);
	        	      if (epcs != null) {
	        	        if (epcsAreIgnoreList) {
	        	          inventoryInfo.inventory = ugi.startInventoryIgnoringEpcs(inventoryInfo, config, epcs);
	        	        } else {
	        	          inventoryInfo.inventory = ugi.startInventory(inventoryInfo, config, epcs);
	        	        }
	        	      } else {
	        	        inventoryInfo.inventory = ugi.startInventory(inventoryInfo, config);
	        	      }
	        	    } else if (_action.equals("stopInventory")) {
	        	      //
	        	      // stopInventory
	        	      //
	        	      String idForMap = _args.getString(0);
	        	      InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
	        	      if (inventoryInfo != null) {
	        	        inventoryInfo.inventory.stopInventory(new UgiInventory.StopInventoryCompletion() {
	        	      	  @Override
	        	      	  public void exec() {
	  	        	        _callbackContext.success();
	        	      	  }
	        	      	});
	        	      } else {
	        	        _callbackContext.error("stopInventory called with no active inventory");
	        	      }
	        	    } else if (_action.equals("pauseInventory")) {
	        	      //
	        	      // pauseInventory
	        	      //
	        	      String idForMap = _args.getString(0);
	        	      InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
	        	      if (inventoryInfo != null) {
	        	        inventoryInfo.inventory.pauseInventory();
	        	        _callbackContext.success();
	        	      } else {
	        	        _callbackContext.error("pauseInventory called with no active inventory");
	        	      }
	        	    } else if (_action.equals("resumeInventory")) {
	        	      //
	        	      // resumeInventory
	        	      //
	        	      String idForMap = _args.getString(0);
	        	      InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
	        	      if (inventoryInfo != null) {
	        	        inventoryInfo.inventory.resumeInventory();
	        	        _callbackContext.success();
	        	      } else {
	        	        _callbackContext.error("resumeInventory called with no active inventory");
	        	      }
	        	    } else if (_action.equals("programTag")) {
	        	      //
	        	      // programTag
	        	      //
	        	      String idForMap = _args.getString(0);
	        	      InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
	        	      if (inventoryInfo != null) {
	        	        String oldEpcString = _args.getString(1);
	        	        UgiEpc oldEpc = new UgiEpc(oldEpcString);
	        	        String newEpcString = _args.getString(2);
	        	        UgiEpc newEpc = new UgiEpc(newEpcString);
	        	        int password = _args.getInt(3);
	        	        inventoryInfo.inventory.programTag(oldEpc, newEpc, password, new UgiInventory.TagAccessCompletion() {          
	        	          @Override
	        	          public void exec(UgiTag tag, UgiInventory.TagAccessReturnValues result) {
	        	            try {
	        	              JSONObject d = new JSONObject();
	        	              d.put("result", result);
	        	              tagToJson(d, tag);
	        	              _callbackContext.success(d);
	        	            } catch (JSONException ex) {
	        	              Log.e(TAG, "programtag callback", ex);
	        	            }
	        	          }
	        	        });
	        	      } else {
	        	        _callbackContext.error("programTag called with no active inventory");
	        	      }
	        	    } else if (_action.equals("writeTag")) {
	        	      //
	        	      // writeTag
	        	      //
	        	      String idForMap = _args.getString(0);
	        	      InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
	        	      if (inventoryInfo != null) {
	        	        String epcString = _args.getString(1);
	        	        UgiEpc epc = new UgiEpc(epcString);
	        	        int mb = _args.getInt(2);
	        	        UgiRfidConfiguration.MemoryBank memoryBank = UgiRfidConfiguration.MemoryBank.values()[mb];
	        	        int offset = _args.getInt(3);
	        	        String s = _args.getString(4);
	        	        byte[] data = stringToByteArray(s);
	        	        s = _args.getString(5);
	        	        byte[] previousData = stringToByteArray(s);
	        	        int password = _args.getInt(6);
	        	        if ((data != null) && (data.length > 0)) {
	        	          inventoryInfo.inventory.writeTag(epc, memoryBank, offset, data, previousData, password, new UgiInventory.TagAccessCompletion() {
	        	            @Override
	        	            public void exec(UgiTag tag, UgiInventory.TagAccessReturnValues result) {
	        	              try {
	        	                JSONObject d = new JSONObject();
	        	                d.put("result", result);
	        	                tagToJson(d, tag);
	        	                _callbackContext.success(d);
	        	              } catch (JSONException ex) {
	        	                Log.e(TAG, "programtag callback", ex);
	        	              }
	        	            }
	        	          });
	        	        }
	        	      } else {
	        	        _callbackContext.error("writeTag called with no active inventory");
	        	      }
	        	    } else if (_action.equals("lockUnlockTag")) {
	        	      //
	        	      // lockUnlockTag
	        	      //
	        	      String idForMap = _args.getString(0);
	        	      InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
	        	      if (inventoryInfo != null) {
	        	        String epcString = _args.getString(1);
	        	        UgiEpc epc = new UgiEpc(epcString);
	        	        int maskAndAction = _args.getInt(2);
	        	        int password = _args.getInt(3);
	        	        inventoryInfo.inventory.lockUnlockTag(epc, maskAndAction, password, new UgiInventory.TagAccessCompletion() {
	        	          @Override
	        	          public void exec(UgiTag tag, UgiInventory.TagAccessReturnValues result) {
	        	            try {
	        	              JSONObject d = new JSONObject();
	        	              d.put("result", result);
	        	              tagToJson(d, tag);
	        	              _callbackContext.success(d);
	        	            } catch (JSONException ex) {
	        	              Log.e(TAG, "programtag callback", ex);
	        	            }
	        	          }
	        	        });
	        	      } else {
	        	        _callbackContext.error("lockUnlockTag called with no active inventory");
	        	      }
	        	    } else if (_action.equals("readTag")) {
	        	      //
	        	      // readTag
	        	      //
	        	      String idForMap = _args.getString(0);
	        	      InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
	        	      if (inventoryInfo != null) {
	        	        String epcString = _args.getString(1);
	        	        UgiEpc epc = new UgiEpc(epcString);
	        	        int mb = _args.getInt(2);
	        	        UgiRfidConfiguration.MemoryBank memoryBank = UgiRfidConfiguration.MemoryBank.values()[mb];
	        	        int offset = _args.getInt(3);
	        	        int minNumBytes = _args.getInt(4);
	        	        int maxNumBytes = _args.getInt(5);
	        	        inventoryInfo.inventory.readTag(epc, memoryBank, offset, minNumBytes, maxNumBytes, new UgiInventory.TagReadCompletion() {
	        	          @Override
	        	          public void exec(UgiTag tag, byte[] data, UgiInventory.TagAccessReturnValues result) {
	        	            try {
	        	              JSONObject d = new JSONObject();
	        	              d.put("result", result);
	        	              d.put("data", byteArrayToString(data));
	        	              tagToJson(d, tag);
	        	              _callbackContext.success(d);
	        	            } catch (JSONException ex) {
	        	              Log.e(TAG, "programtag callback", ex);
	        	            }
	        	          }
	        	        });
	        	      } else {
	        	        _callbackContext.error("readTag called with no active inventory");
	        	      }
	        	    } else if (_action.equals("customCommandToTag")) {
	        	      //
	        	      // customCommandToTag
	        	      //
	        	      String idForMap = _args.getString(0);
	        	      InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
	        	      if (inventoryInfo != null) {
	        	        String epcString = _args.getString(1);
	        	        UgiEpc epc = new UgiEpc(epcString);
	        	        String commandString = _args.getString(2);
	        	        byte[] commandBytes = stringToByteArray(commandString);
	        	        int commandBits = _args.getInt(3);
	        	        int responseBitLengthNoHeaderBit = _args.getInt(4);
	        	        int responseBitLengthWithHeaderBit = _args.getInt(5);
	        	        int receiveTimeoutUsec = _args.getInt(6);
	        	        inventoryInfo.inventory.customCommandToTag(epc, commandBytes, commandBits, responseBitLengthNoHeaderBit, responseBitLengthWithHeaderBit,
	        	                receiveTimeoutUsec, new UgiInventory.TagCustomCommandCompletion() {
	        	          @Override
	        	          public void exec(UgiTag tag, boolean headerBit, byte[] response, UgiInventory.TagAccessReturnValues result) {
	        	            try {
	        	              JSONObject d = new JSONObject();
	        	              d.put("result", result);
	        	              d.put("headerBit", headerBit);
	        	              d.put("response", byteArrayToString(response));
	        	              tagToJson(d, tag);
	        	              _callbackContext.success(d);
	        	            } catch (JSONException ex) {
	        	              Log.e(TAG, "programtag callback", ex);
	        	            }
	        	          }
	        	        });
	        	      } else {
	        	        _callbackContext.error("customCommandToTag called with no active inventory");
	        	      }
	        	    } else if (_action.equals("changePower")) {
	        	      //
	        	      // changePower
	        	      //
	        	      String idForMap = _args.getString(0);
	        	      InventoryInfo inventoryInfo = inventoryInfos.get(idForMap);
	        	      if (inventoryInfo != null) {
	        	      	double initialPowerLevel = _args.getDouble(1);
	        	      	double minPowerLevel = _args.getDouble(2);
	        	      	double maxPowerLevel = _args.getDouble(3);
	        	        inventoryInfo.inventory.changePower(initialPowerLevel, minPowerLevel, maxPowerLevel, new UgiInventory.ChangePowerCompletion() {
	        	          @Override
	        	          public void exec(boolean success) {
	        	            try {
	        	              JSONObject d = new JSONObject();
	        	              d.put("success", success);
	        	              _callbackContext.success(d);
	        	            } catch (JSONException ex) {
	        	              Log.e(TAG, "programtag callback", ex);
	        	            }
	        	          }
	        	        });
	        	      } else {
	        	        _callbackContext.error("customCommandToTag called with no active inventory");
	        	      }

	        	    }
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    // Battery
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    else if (_action.equals("getBatteryInfo")) {
	        	      //
	        	      // getBatteryInfo
	        	      //
	        	      Ugi.BatteryInfo info = ugi.getBatteryInfo();
	        	      JSONObject d = new JSONObject();
	        	      d.put("canScan", info.canScan);
	        	      d.put("externalPowerIsConnected", info.externalPowerIsConnected);
	        	      d.put("isCharging", info.isCharging);
	        	      d.put("minutesRemaining", info.minutesRemaining);
	        	      d.put("percentRemaining", info.percentRemaining);
	        	      d.put("voltage", info.voltage);
	        	      _callbackContext.success(d);
	        	    }
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    // Firmware update
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    else if (_action.equals("automaticCheckForFirmwareUpdate")) {
	        	      //
	        	      // automaticCheckForFirmwareUpdate
	        	      //
        	    	  ugi.automaticCheckForFirmwareUpdate(Ugi.FIRMWARE_CHANNEL_RELEASE,
        	    			                              new Ugi.AutomaticCheckForFirmwareUpdateCompletion() {
						@Override
						public void updateReady(UgiFirmwareUpdateInfo info, boolean required) {
        	              try {
	    	                JSONObject d = new JSONObject();
							d.put("required", required);
	    	                if (info != null) {
	    	                  d.put("name", info.getName());
	    	                  d.put("notes", info.getNotes());
	    	                  d.put("softwareVersionMajor", info.getSoftwareVersionMajor());
	    	                  d.put("softwareVersionMinor", info.getSoftwareVersionMinor());
	    	                  d.put("softwareVersionBuild", info.getSoftwareVersionBuild());
	    	                  d.put("sofwareVersionDate", info.getSofwareVersionDate().getTime());
	    	                }
	    	                _callbackContext.success(d);
  						  } catch (JSONException e) {
							e.printStackTrace();
						  }
						}
					  });
		        	} else if (_action.equals("loadUpdateWithName")) {
	        	      //
	        	      // loadUpdateWithName
	        	      //
		        	  String name = _args.getString(0);
		        	  ugi.loadUpdateWithName(name, new Ugi.LoadUpdateWithNameCompletion() {
						@Override
						public void updateLoaded(boolean success) {
	    	              JSONObject d = new JSONObject();
        	              try {
	    	                d.put("success", success);
  						  } catch (JSONException e) {
							e.printStackTrace();
						  }
	    	              _callbackContext.success(d);
						}
					  });
		        	} else if (_action.equals("firmwareUpdate")) {
	        	      //
	        	      // firmwareUpdate
	        	      //
		        	  firmwareCallbackContext = _callbackContext;
		        	  ugi.firmwareUpdate(_this);
		        	} else if (_action.equals("forceFirmwareChannelReload")) {
	        	      //
	        	      // forceFirmwareChannelReload
	        	      //
			          boolean onlyIfSomeTimeHasPassed = _args.getBoolean(0);
	        		  ugi.forceFirmwareChannelReload(onlyIfSomeTimeHasPassed);
		        	} else if (_action.equals("forceFirmwareGrokkerCheck")) {
	        	      //
	        	      // forceFirmwareGrokkerCheck
	        	      //
	        		  ugi.forceFirmwareGrokkerCheck();
	        	    }
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    // Region
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    else if (_action.equals("userMustSetRegion")) {
		        	      //
		        	      // userMustSetRegion
		        	      //
	    	              JSONObject d = new JSONObject();
	    	              d.put("value", ugi.getUserMustSetRegion());
	    	              _callbackContext.success(d);
		        	} else if (_action.equals("userCanSetRegion")) {
	        	      //
	        	      // userCanSetRegion
	        	      //
    	              JSONObject d = new JSONObject();
    	              d.put("value", ugi.getUserCanSetRegion());
    	              _callbackContext.success(d);
		        	} else if (_action.equals("getRegionNames")) {
                  //
                  // getRegionNames
                  //
                  ugi.getRegionNames(new Ugi.GetRegionNamesCompletion() {
                    @Override
                    public void exec(String[] regionNames, int selectedIndex) {
                      if (regionNames != null) {
                        try {
                          JSONObject d = new JSONObject();
                          JSONArray a = new JSONArray();
                          for (String name : regionNames) {
                            a.put(name);
                          }
                          d.put("regionNames", a);
                          d.put("selectedIndex", selectedIndex);
                          _callbackContext.success(d);
                        } catch (JSONException ex) {
                        }
                      } else {
                        _callbackContext.success();
                      }
                    }
                  });
		        	} else if (_action.equals("setRegion")) {
	        	      //
	        	      // setRegion
	        	      //
		        	  String regionName = _args.getString(0);
	        		  ugi.setRegion(regionName, new Ugi.SetRegionCompletion() {
					    @Override
					    public void exec(boolean success) {
	    	              try {
    	                    JSONObject d = new JSONObject();
							d.put("success", success);
	    	                _callbackContext.success(d);
						  } catch (JSONException e) {
							e.printStackTrace();
						  }
					    }
					  });
	        	    }
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    // UNKNOWN
	        	    //////////////////////////////////////////////////////////////////////////////////////
	        	    else {
	        	      Log.i(TAG, "execute: unknown action: " + _action);
	        	    }
	        	} catch (JSONException ex) {
	    }
	        }
	        });
	    return true;
  }

  ///////////////////////////////////////////////////////////////////////////////////////
  // ConnectionStateListener
  ///////////////////////////////////////////////////////////////////////////////////////

  private static class OurConnectionStateListener implements Ugi.ConnectionStateListener
  {
    private CallbackContext callbackContext;

    public OurConnectionStateListener(CallbackContext callbackContext) {
      this.callbackContext = callbackContext;
    }

    @Override
    public void connectionStateChanged(Ugi.ConnectionStates connectionState) {
      try {
        JSONObject d = new JSONObject();
        d.put("state", connectionState.ordinal());
        d.put("isAnythingPluggedIntoAudioJack", ugi.isAnythingPluggedIntoAudioJack());
        d.put("requiredProtocolVersion", ugi.getRequiredProtocolVersion());
        d.put("supportedProtocolVersion", ugi.getSupportedProtocolVersion());
        d.put("readerProtocolVersion", ugi.getReaderProtocolVersion());
        d.put("readerHardwareModel", ugi.getReaderHardwareModel());
        d.put("readerSerialNumber", ugi.getReaderSerialNumber());
        d.put("firmwareVersion", ugi.getFirmwareVersionMajor() + "." + ugi.getFirmwareVersionMinor() + "."
                                 + ugi.getFirmwareVersionBuild());
        d.put("regionName", ugi.getRegionName());
        d.put("numVolumeLevels", ugi.getNumVolumeLevels());
        d.put("batteryCapacity", ugi.getBatteryCapacity());
        d.put("batteryCapacity_mAh", ugi.getBatteryCapacity_mAh());
        d.put("readerDescription", ugi.getReaderDescription());

        PluginResult pluginResult = new PluginResult(Status.OK, d);
        pluginResult.setKeepCallback(true);
        this.callbackContext.sendPluginResult(pluginResult);
      } catch (JSONException ex) {
        Log.e(TAG, "connectionStateChanged", ex);
      }
    }
  }

  ///////////////////////////////////////////////////////////////////////////////////////
  // Firmware Update delegate
  ///////////////////////////////////////////////////////////////////////////////////////

  @Override
  public void firmwareUpdateCompleted(Ugi.FirmwareUpdateReturnValues result, int seconds) {
    JSONObject d = new JSONObject();
    try {
      d.put("success", (result == Ugi.FirmwareUpdateReturnValues.SUCCESS));
      d.put("seconds", seconds);
	} catch (JSONException e) {
	  e.printStackTrace();
	}
	PluginResult pluginResult = new PluginResult(Status.OK, d);
	this.firmwareCallbackContext.sendPluginResult(pluginResult);
  }

  @Override
  public boolean firmwareUpdateProgress(int amountDone, int amountTotal, boolean canCancel) {
    JSONObject d = new JSONObject();
    try {
        d.put("amountDone", amountDone);
        d.put("amountTotal", amountTotal);
        d.put("canCancel", canCancel);
	} catch (JSONException e) {
	  e.printStackTrace();
	}
	PluginResult pluginResult = new PluginResult(Status.OK, d);
	pluginResult.setKeepCallback(true);
	this.firmwareCallbackContext.sendPluginResult(pluginResult);
	return false;
  }

  ///////////////////////////////////////////////////////////////////////////////////////
  // Byte arrays and strings
  ///////////////////////////////////////////////////////////////////////////////////////

  private static String byteArrayToString(byte[] ba) {
    if (ba == null) return null;
    StringBuffer sb = new StringBuffer(ba.length*2);
    for (int i = 0; i < ba.length; i++) {
      byte b = ba[i];
      sb.append(NibbleToChar((b >> 4) & 0xf));
      sb.append(NibbleToChar(b & 0xf));
    }
    return sb.toString();
  }

  private static char NibbleToChar(int nibble) {
    return (char) (nibble + (nibble < 10 ? '0' : 'a'-10));
  }

  ///////////////////

  private static byte[] stringToByteArray(String s) {
    byte[] ba = new byte[s.length()/2];
    for (int i = 0; i < ba.length; i++) {
      int highNibble = CharToNibble(s.charAt(i*2));
      if (highNibble == -1) return null;
      int lowNibble = CharToNibble(s.charAt((i*2)+1));
      if (lowNibble == -1) return null;
      ba[i] = (byte) ((highNibble << 4) | lowNibble);
    }
    return ba;
  }

  private static int CharToNibble(char c) {
    if ((c >= '0') && (c <= '9')) return c - '0';
    if ((c >= 'a') && (c <= 'z')) return c - 'a' + 10;
    if ((c >= 'A') && (c <= 'Z')) return c - 'A' + 10;
    return -1;
  }

}
