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


  init: function()
  {
    // Set a custom stylesheet based on user preference
    var skin = prefUtils.getPref("string", "extensions.pcookie.skin");
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
    var uri = ios.newURI("chrome://pcookie/skin/" + skin + "/pcookie.css", null, null);
    console.debug(uri);
    if(!sss.sheetRegistered(uri, sss.USER_SHEET))
      sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
  
    // If this is first time run then add button to addon bar
    // TODO: consider making this an int and 'migratedVersion' or similar to
    // allow updating preferences on first load of new version
    if (prefUtils.getPref("bool", "extensions.pcookie.firstrun")) {
      prefUtils.setPref("bool", "extensions.pcookie.firstrun", false)
      var addonBar = document.getElementById("addon-bar");
      if (!document.getElementById("pcookie-status-button")) {
        addonBar.insertItem("pcookie-status-button");
        addonBar.setAttribute("currentset", addonBar.currentSet);
        addonBar.collapsed = false;
      }
    }
    try {
      gBrowser.addProgressListener(pCookieProgressListener);
    }catch(e){}
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
      if (prefUtils.getPref("bool", "extensions.pcookie.stripwww"))
        sdom = pCookie.stripWWW(host);
    } catch(e) {
      prefUtils.setPref("bool", "extensions.pcookie.stripwww", false)
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


  initDialog: function()
  {
    var tabsbox = document.getElementById("tabs");
    if(window.arguments[2].gBrowser.browsers.length <= 1)
      tabsbox.setAttribute("hidden", true);

    var inurl = window.arguments[0];
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


  onDialogOK: function()
  {
    var url = window.arguments[1];
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
      url.host = outurl;
      permMan.remove(outurl, "cookie");
      if(sel != "remove")
        permMan.add(url, "cookie", action);
    }
    window.arguments[2].pCookie.updateButton(url);
  },


  setForTabs: function(aAction, aWindow) {
    var permMan = pCookie.getPerm();
    if(permMan == null) return;
    var browsers = aWindow.gBrowser.browsers;

    for (var i=0; i<browsers.length; ++i) {
      var webNav = browsers[i].webNavigation;
      var host = webNav.currentURI.host;
    if (prefUtils.getPref("bool", "extensions.pcookie.stripwww"))
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
    var url = pCookie.urlbox.value;
    var permMan = pCookie.getPerm();
    var retval = "error";
    if(permMan == null) return retval;
    var uri = Components.classes["@mozilla.org/network/standard-url;1"]
        .createInstance(Components.interfaces.nsIURI);
    uri.spec = url;
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
