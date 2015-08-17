//////////////////////////////////
// pcookie.js
// Daniel Lindkvist
// 2005-09-22
//////////////////////////////////

var _DEBUG = false;


var pCookieProgressListener =
{
  stateIsRequest:false,

  QueryInterface : function(aIID)
  {
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
        aIID.equals(Components.interfaces.nsISupports))
        return this;
      throw Components.results.NS_NOINTERFACE;
  },

  onStateChange : function(a,b,c,d) {},
  onProgressChange : function(a,b,c,d,e,f){},
  onStatusChange : function(a,b,c,d){},
  onSecurityChange : function(a,b,c){},
  onLinkIconAvailable : function(a){},

  onLocationChange : function(aProgress, aRequest, aLocation)
  {
    pCookie.updateButton(aLocation);
  }
};


var pCookie =
{
  urlbox: null,
  permMan: null,
  appInfo: null,
  activeSkin: "",

  init: function()
  {
    // Revisions and what happened:
    // 1 - (v2.0.0) adds button to addon bar, migrates v1 preferences, set dreadnaut skin
    // 0 - default
    if (prefUtils.getPref("int", "extensions.pcookie.revision") < 1) {
      // Add pref
      var addonBar = document.getElementById("addon-bar");
      if (!document.getElementById("pcookie-status-button")) {
        addonBar.insertItem("pcookie-status-button");
        addonBar.setAttribute("currentset", addonBar.currentSet);
        addonBar.collapsed = false;
      }
      
      // Migrate old preference if exists
      var oldstripwww = prefUtils.getPref("bool", "pcookies.stripwww");
      if (oldstripwww != "!/!ERROR_UNDEFINED_PREF!/!") {
        prefUtils.setPref("bool", "extensions.pcookie.strip_www", oldstripwww);
        prefUtils.deletePref("pcookies.stripwww");        
      }
      
      // Would prefer to keep this at classic for upgrades but there's no way to
      // determine if this is an upgrade or new install.  The welcome page that
      // loads will describe the change and how to change it back.
      // Don't use default prefs since if we do change the default later it will
      // change anyone that's using the dreadnaut skin.
      prefUtils.setPref("string", "extensions.pcookie.skin", "dreadnaut");
      
      prefUtils.setPref("int", "extensions.pcookie.revision", 1);
    }

    pCookie.setSkin();

    // Revisions and what happened:
    // 1 - (v2.0.0) mention all the changes done in version 2.0
    // 0 - default
    if (prefUtils.getPref("int", "extensions.pcookie.whats_new_revision") < 1) {
      // IMPORTANT: set the preference before loading page or you could get an infinite loop going
      prefUtils.setPref("int", "extensions.pcookie.whats_new_revision", 1);
      // Need a pause or the start page overwrites it
      pCookie.openWhatsNew(5);
    }
    
    try {
      gBrowser.addProgressListener(pCookieProgressListener);
    }catch(e){}
  },

  openWhatsNew: function(aDelay)
  {
    // Opens the whatsnew page in a new tab and selects it, optioanlly with a delay in seconds
    if (typeof(aDelay)!=='number') aDelay = 0;
    
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
             .getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow('navigator:browser');
    
    if (aDelay > 0) {
      win.setTimeout(function() {
        win.gBrowser.selectedTab = win.gBrowser.addTab("chrome://pcookie/content/welcome/whatsnew.html");
      }, aDelay * 1000);
    } else {
      win.gBrowser.selectedTab = win.gBrowser.addTab("chrome://pcookie/content/welcome/whatsnew.html");
    }
  },
  
  setSkin: function()
  {
    // Set a custom stylesheet based on user preference
    var skin = prefUtils.getPref("string", "extensions.pcookie.skin");
    if (skin == "") {
      console.warn("extensions.pcookie.skin is blank, reset to dreadnaut");  
      prefUtils.setPref("string", "extensions.pcookie.skin", "dreadnaut");
      skin = "dreadnaut";
    }
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
    var uri = ios.newURI("chrome://pcookie/skin/" + skin + "/pcookie.css", null, null);

    if(pCookie.activeSkin != "") {
      if(sss.sheetRegistered(pCookie.activeSkin, sss.USER_SHEET))
        sss.unregisterSheet(pCookie.activeSkin, sss.USER_SHEET);
    }
    if(!sss.sheetRegistered(uri, sss.USER_SHEET))
      sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
    pCookie.activeSkin = uri;
  },


  exit: function()
  {
    try {
      gBrowser.removeProgressListener(pCookieProgressListener);
    }catch(e){}
  },


  permit: function()
  {
    var url = gBrowser.currentURI;
    var localUrl = url.clone();
    var host = localUrl.host;
    var msg = document.getElementById("pcookieStrings").getString("alert.warning");
    if(host == "") {
      alert(msg);
      return;
    }

    var sdom = host;
    try {
      if (prefUtils.getPref("bool", "extensions.pcookie.strip_www"))
        sdom = pCookie.stripWWW(host);
    } catch(e) {
      prefUtils.setPref("bool", "extensions.pcookie.strip_www", false)
    }
    localUrl.host = sdom;
    host = sdom;
    openDialog("chrome://pcookie/content/pcDialog.xul", "",
      "centerscreen,chrome,dialog,resizable=no,dependent",
      host, localUrl, window);
  },


  stripWWW: function(url)
  {
    var reg = /www./i;
    return url.replace(reg, "");
  },


  getPerm: function()
  {
    if(pCookie.permMan == null)
      pCookie.permMan = Components.classes["@mozilla.org/permissionmanager;1"].getService()
                          .QueryInterface(Components.interfaces.nsIPermissionManager);
    return pCookie.permMan;

  },

  
  getAppInfo: function()
  {
    if(pCookie.appInfo == null)
      pCookie.appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);
    return pCookie.appInfo;
  },
  
  
  browserVersionAtLeast: function(aMinVersion)
  {
    var appInfo = pCookie.getAppInfo();
    var versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                            .getService(Components.interfaces.nsIVersionComparator);
    var compareResult = versionComparator.compare(appInfo.platformVersion, aMinVersion);
    if (compareResult < 0) {
      // current version is lower than specified min version
      return false;
    }
    else {
      // current version either matches or is higher than specified min version
      return true;
    }
  },  

  
  initDialog: function()
  {
    var tabsbox = document.getElementById("tabs");
    if(window.arguments[2].gBrowser.browsers.length <= 1)
      tabsbox.setAttribute("hidden", true);

    // urlbox shouldn't contain scheme if we're going to modify both
    if (prefUtils.getPref("bool", "extensions.pcookie.modify_http_and_https")) {
      var inurl = window.arguments[1].host;
    } else {
      var inurl = window.arguments[1].prePath;
    }
    
    pCookie.urlbox = document.getElementById("url");
    pCookie.urlbox.value = inurl;
    pCookie.updateStatus();
  },


  onTabsChanged: function()
  {
    var tabsbox = document.getElementById("tabs");
    var urlfield = document.getElementById("url");
    if(tabsbox.checked)
      urlfield.disabled = true;
    else
      urlfield.disabled = false;
  },


  updateStatus: function()
  {
    var label = document.getElementById("stateValue");
    var perm = pCookie.checkState();
    label.value = perm;

    var radio = document.getElementById("pRadiogroup");
    switch (perm) {
      case "allowed" : radio.selectedIndex = 0;
        break;
      case "session" : radio.selectedIndex = 1;
        break;
      case "blocked" : radio.selectedIndex = 2;
        break;
      case "not set" : radio.selectedIndex = 0;
        break;
    }
  },

  
  makeURI: function(aURL, aOriginCharset, aBaseURI)
  {
    if (typeof(aOriginCharset)==='undefined') aOriginCharset = null;
    if (typeof(aBaseURI)==='undefined') aBaseURI = null;
    
    if ( aURL.match(/^http/) === null )
    {
      aURL = "http://".concat(aURL);
    }

    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
    return ioService.newURI(aURL, aOriginCharset, aBaseURI);
  },

  
  onDialogOK: function()
  {
    var uri = window.arguments[1];
    var permMan = pCookie.getPerm();
    if(permMan == null) return;
    var rgroup = document.getElementById("pRadiogroup");
    var sel = rgroup.selectedItem.id;
    var action;
    if(sel == "allow")
      action = permMan.ALLOW_ACTION;
    else if (sel == "session")
      action = 8;
    else if (sel == "block")
      action = permMan.DENY_ACTION;

    if(document.getElementById("tabs").checked) { // set for all tabs
      pCookie.setForTabs(action, window.arguments[2]);
      return;
    }
    var outurl = pCookie.urlbox.value;
    if(outurl != "") {
      if (prefUtils.getPref("bool", "extensions.pcookie.modify_http_and_https")) {
        // It's actually easier to work on an NSUri object
        var oldurl = pCookie.makeURI(outurl);
        var httpurl = "http://".concat(oldurl.host);
        var httpsurl = "https://".concat(oldurl.host);
        pCookie.removePermission(httpurl);
        pCookie.removePermission(httpsurl);
        if(sel != "remove") {
          permMan.add(pCookie.makeURI(httpurl), "cookie", action);
          permMan.add(pCookie.makeURI(httpsurl), "cookie", action);
        }
      } else {
        pCookie.removePermission(outurl);
        if(sel != "remove")
          permMan.add(pCookie.makeURI(outurl), "cookie", action);
      }
    }
    window.arguments[2].pCookie.updateButton(uri);
  },

  
  removePermission: function(aURL) {
    // Takes two parameters:
    //   aURL - string - the URL to remove permission for, must be a string not NSUri
    if (typeof(aURL)!=='string') return;
    
    var permMan = pCookie.getPerm();
    var url = aURL;
    
    // Mozilla bug: 1170200
    if (pCookie.browserVersionAtLeast('42*')) {
      // With Firefox v42 the remove function takes a nsIURI type now
      // TODO:2015-08-13: Remove this check and set minVersion to 42 in
      // a year or two.
      var url = pCookie.makeURI(aURL);
    }
    permMan.remove(url, "cookie");
  },
  

  setForTabs: function(aAction, aWindow) {
    var permMan = pCookie.getPerm();
    if(permMan == null) return;
    var browsers = aWindow.gBrowser.browsers;

    for (var i=0; i<browsers.length; ++i) {
      var webNav = browsers[i].webNavigation;
      var host = webNav.currentURI.host;
    if (prefUtils.getPref("bool", "extensions.pcookie.strip_www"))
        host = pCookie.stripWWW(host);
      if(host == "" || host == " ")
        continue;
      permMan.remove(host, "cookie");
      if(aAction == permMan.ALLOW_ACTION || aAction == permMan.DENY_ACTION ||
            aAction == 8) {
        var url = webNav.currentURI;
        url = url.clone();
        url.host = host;
        permMan.add(url, "cookie", aAction);
      }
    }
    aWindow.pCookie.updateButton();
  },


  checkState: function()
  {
    // not set:0  allowed:1  blocked:2 session:8
    var strings = document.getElementById("pcookieStrings");
    var uri = pCookie.makeURI(pCookie.urlbox.value);
    var permMan = pCookie.getPerm();
    var retval = "error";
    if(permMan == null) return retval;
    var state = permMan.testPermission(uri, "cookie");
    switch (state) {
      case 0: retval = strings.getString("status.notset");
        break;
      case 1: retval = strings.getString("status.allowed");
        break;
      case 2: retval = strings.getString("status.blocked");
        break;
      case 8: retval = strings.getString("status.session");
        break;
    }
    return retval;
  },


  updateButton: function(aURI)
  {
    try {
      var permMan = pCookie.getPerm();
      if(permMan == null || aURI == null) return;
      var state = permMan.testPermission(aURI, "cookie");
      var button = document.getElementById("pcookie-status-button");
      if(!button)
        return;

      switch (state) {
        case 0: button.setAttribute("status", "notset");
          break;
        case 1: button.setAttribute("status", "allowed");
          break;
        case 2: button.setAttribute("status", "blocked");
          break;
        case 8: button.setAttribute("status", "session");
          break;
      }
    }catch(e){if(_DEBUG) alert(e);}
  }

};// end pCookie

addEventListener("load", pCookie.init, false);
addEventListener("unload", pCookie.exit, false);
