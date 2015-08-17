// Arbitrary number incremented whenever something has to be done on first run
pref("extensions.pcookie.revision", 0);

// Arbitrary number incremented whenever the What's New page should load
pref("extensions.pcookie.whats_new_revision", 0);

// Should www be stripped when adding rule
pref("extensions.pcookie.strip_www", false);

// Intentially blank.  If this was set to classic and the user chose classic
// then firefox would remove the user preference and go by the default. This
// setting I want to stick if the default is changed later.
pref("extensions.pcookie.skin", "");

// Modify both http and https schemes at the same time.  This allows v42+ of
// firefox to operate the same as older versions
pref("extensions.pcookie.modify_http_and_https", true);