/**
 * prefUtils.js
 * 0.4
 * 2004-12-13
 * Daniel Lindkvist
 **/

// settings
var _DEBUG = false;
var AUTO_SET_PREFS = true;

if(_DEBUG) dump("in prefutils\n");


var prefUtils =
{
  onLoad: function(aDialogId)
  {
    var dialog = document.getElementById(aDialogId);
    if(_DEBUG) dump("in onLoad\n");
    if(!dialog) {
      if(_DEBUG) dump("No dialog id supplied?\n");
      return;
    }
    var prefElements = dialog.getElementsByAttribute("prefstring", "*");
    if(!prefElements) {
      if(_DEBUG) dump("prefElements empty\n");
      return;
    }
    for(var i=0; i<prefElements.length; i++) {
      var prefstring = prefElements[i].getAttribute("prefstring");
      var prefid = prefElements[i].getAttribute("id");
      var preftype = prefElements[i].getAttribute("preftype");
      var elt = prefElements[i].localName;
      var prefdefval = prefElements[i].getAttribute("prefdefval");
      if(!prefdefval)
        prefdefval = "";

      if (!preftype) {
        if (elt == "textbox")
          preftype = "string";
        else if (elt == "checkbox" || elt == "button")
          preftype = "bool";
        else if (elt == "radiogroup" || elt == "menulist")
          preftype = "int";
      }
      var prefvalue = prefUtils.getPref(preftype, prefstring, prefdefval);
      if(_DEBUG) dump("pref collected: "+ prefvalue+"\n");
      if(_DEBUG) dump("elementtype: "+ elt+"\n\n");
      if(prefvalue == "!/!ERROR_UNDEFINED_PREF!/!") {
        prefvalue = prefdefval;
        if(AUTO_SET_PREFS)
          prefUtils.setPref(preftype, prefstring, prefvalue);
      }
      switch(elt) {
        case "textbox":
          prefElements[i].value = prefvalue;
          break;
        case "checkbox":
          prefElements[i].checked = prefvalue;
          break;
        case "button":
          prefElements[i].checked = prefvalue;
          break;
        case "radiogroup":
          prefElements[i].value = prefvalue;
          break;
        case "menulist":
          prefElements[i].selectedIndex = prefvalue;
          break;
      }
    }
    if(_DEBUG) dump("init finished\n");
  },// end init


  onOK: function(aDialogId, aObserverTopicId)
  {
    var dialog = document.getElementById(aDialogId);
    var prefElements = dialog.getElementsByAttribute("prefstring", "*");

    for(var i=0; i<prefElements.length; i++) {
      var prefstring = prefElements[i].getAttribute("prefstring");
      var preftype = prefElements[i].getAttribute("preftype");

      var elt = prefElements[i].localName;
      if (!preftype) {
        if (elt == "textbox")
          preftype = "string";
        else if (elt == "checkbox" || elt == "button")
          preftype = "bool";
        else if (elt == "radiogroup" || elt == "menulist")
          preftype = "int";
      }
      var prefvalue; 
      if (elt == "checkbox")
        prefvalue = prefElements[i].checked;
      else if (elt == "button")
        prefvalue = prefElements[i].checked;
      else if (elt == "radiogroup" || elt == "menulist")
        prefvalue = prefElements[i].selectedIndex;
      else if (elt == "textbox")
        prefvalue = prefElements[i].value;

      prefUtils.setPref(preftype, prefstring, prefvalue);
      if(_DEBUG) dump("setpref:" +prefstring+" "+ prefvalue + "\n");
    }
    // notify observers
    if (aObserverTopicId)
    Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService)
        .notifyObservers(null, aObserverTopicId, "");
    return true;
  },// end onOk


  getPref: function(aPrefType, aPrefString)
  {
    if(_DEBUG) dump("in getpref\n");
    var pref = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    try {
      switch(aPrefType) {
        case "bool":
          return pref.getBoolPref(aPrefString);
        case "int":
          return pref.getIntPref(aPrefString);
        case "localizedstring":
          return pref.getLocalizedUnicharPref(aPrefString); // not working?
        case "color":
        case "string":
        default:
          return pref.getCharPref(aPrefString); 
      }
    }catch(e) {
      if(_DEBUG) {
        dump("*** no default pref for " + aPrefType + " pref: " + aPrefString + "\n");
        dump(e + "\n");
      }
    }
    return "!/!ERROR_UNDEFINED_PREF!/!";
  },


  setPref: function(aPrefType, aPrefString, aValue)
  {
    var pref = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    try {
      switch (aPrefType) {
        case "bool":
          pref.setBoolPref(aPrefString, aValue);
          break;
        case "int":
          pref.setIntPref(aPrefString, aValue);
          break;
        case "color":
        case "string":
        case "localizedstring":
        default:
          pref.setCharPref(aPrefString, aValue);
          break;
      }
    }catch(e){
      if(_DEBUG) dump(e + "\n");
    }
  },

  pickPath: function(aId)
  {
    var fp = Components.classes["@mozilla.org/filepicker;1"]
             .createInstance(Components.interfaces.nsIFilePicker);
    fp.init(window, "", fp.modeGetFolder);
    if (fp.show() == fp.returnCancel)
      return;
    var path = fp.file.target;
    var element = document.getElementById(aId);
    if(element)
      element.value = path;
    return path;
  },


  initControls:function(ids)
  {
    if(ids.length < 2)
      return;
    var master = document.getElementById(ids[0]);
    var slave;
    for(var x=1; x<ids.length; x++) {
      slave = document.getElementById(ids[x]);
      if(master.checked)
        slave.disabled = true;
      else
        slave.disabled = false;
    }
  }
};// end prefUtils