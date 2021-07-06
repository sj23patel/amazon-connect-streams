/*! @license sprintf.js | Copyright (c) 2007-2013 Alexandru Marasteanu <hello at alexei dot ro> | 3 clause BSD license */

(function() {
   var ctx = this;

	var sprintf = function() {
		if (!sprintf.cache.hasOwnProperty(arguments[0])) {
			sprintf.cache[arguments[0]] = sprintf.parse(arguments[0]);
		}
		return sprintf.format.call(null, sprintf.cache[arguments[0]], arguments);
	};

	sprintf.format = function(parse_tree, argv) {
		var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
		for (i = 0; i < tree_length; i++) {
			node_type = get_type(parse_tree[i]);
			if (node_type === 'string') {
				output.push(parse_tree[i]);
			}
			else if (node_type === 'array') {
				match = parse_tree[i]; // convenience purposes only
				if (match[2]) { // keyword argument
					arg = argv[cursor];
					for (k = 0; k < match[2].length; k++) {
						if (!arg.hasOwnProperty(match[2][k])) {
							throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
						}
						arg = arg[match[2][k]];
					}
				}
				else if (match[1]) { // positional argument (explicit)
					arg = argv[match[1]];
				}
				else { // positional argument (implicit)
					arg = argv[cursor++];
				}

				if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
					throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
				}
				switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = arg >>> 0; break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
				}
				arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
				pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
				pad_length = match[6] - String(arg).length;
				pad = match[6] ? str_repeat(pad_character, pad_length) : '';
				output.push(match[5] ? arg + pad : pad + arg);
			}
		}
		return output.join('');
	};

	sprintf.cache = {};

	sprintf.parse = function(fmt) {
		var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
		while (_fmt) {
			if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
				parse_tree.push(match[0]);
			}
			else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
				parse_tree.push('%');
			}
			else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
				if (match[2]) {
					arg_names |= 1;
					var field_list = [], replacement_field = match[2], field_match = [];
					if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
						field_list.push(field_match[1]);
						while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
							if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else {
								throw('[sprintf] huh?');
							}
						}
					}
					else {
						throw('[sprintf] huh?');
					}
					match[2] = field_list;
				}
				else {
					arg_names |= 2;
				}
				if (arg_names === 3) {
					throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
				}
				parse_tree.push(match);
			}
			else {
				throw('[sprintf] huh?');
			}
			_fmt = _fmt.substring(match[0].length);
		}
		return parse_tree;
	};

	var vsprintf = function(fmt, argv, _argv) {
		_argv = argv.slice(0);
		_argv.splice(0, 0, fmt);
		return sprintf.apply(null, _argv);
	};

	/**
	 * helpers
	 */
	function get_type(variable) {
		return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
	}

	function str_repeat(input, multiplier) {
		for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
		return output.join('');
	}

	/**
	 * export to either browser or node.js
	 */
	ctx.sprintf = sprintf;
	ctx.vsprintf = vsprintf;
})();


/*
 * Copyright 2014-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
(function () {
  var global = this;
  connect = global.connect || {};
  global.connect = connect;
  global.lily = connect;

  var userAgent = navigator.userAgent;
  var ONE_DAY_MILLIS = 24 * 60 * 60 * 1000;
  var DEFAULT_POPUP_HEIGHT = 578;
  var DEFAULT_POPUP_WIDTH = 433;

  /**
   * Unpollute sprintf functions from the global namespace.
   */
  connect.sprintf = global.sprintf;
  connect.vsprintf = global.vsprintf;
  delete global.sprintf;
  delete global.vsprintf;

  connect.HTTP_STATUS_CODES = {
    SUCCESS: 200,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
  };

  connect.TRANSPORT_TYPES = {
    CHAT_TOKEN: "chat_token",
    WEB_SOCKET: "web_socket"
  };

  /**
   * Binds the given instance object as the context for
   * the method provided.
   *
   * @param scope The instance object to be set as the scope
   *    of the function.
   * @param method The method to be encapsulated.
   *
   * All other arguments, if any, are bound to the method
   * invocation inside the closure.
   *
   * @return A closure encapsulating the invocation of the
   *    method provided in context of the given instance.
   */
  connect.hitch = function () {
    var args = Array.prototype.slice.call(arguments);
    var scope = args.shift();
    var method = args.shift();

    connect.assertNotNull(scope, 'scope');
    connect.assertNotNull(method, 'method');
    connect.assertTrue(connect.isFunction(method), 'method must be a function');

    return function () {
      var closureArgs = Array.prototype.slice.call(arguments);
      return method.apply(scope, args.concat(closureArgs));
    };
  };

  /**
   * Determine if the given value is a callable function type.
   * Borrowed from Underscore.js.
   */
  connect.isFunction = function (obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  };

  /**
   * Determine if the given value is an array.
   */
  connect.isArray = function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   * Get a list of keys from a Javascript object used
   * as a hash map.
   */
  connect.keys = function (map) {
    var keys = [];

    connect.assertNotNull(map, 'map');

    for (var k in map) {
      keys.push(k);
    }

    return keys;
  };

  /**
   * Get a list of values from a Javascript object used
   * as a hash map.
   */
  connect.values = function (map) {
    var values = [];

    connect.assertNotNull(map, 'map');

    for (var k in map) {
      values.push(map[k]);
    }

    return values;
  };

  /**
   * Get a list of key/value pairs from the given map.
   */
  connect.entries = function (map) {
    var entries = [];

    for (var k in map) {
      entries.push({ key: k, value: map[k] });
    }

    return entries;
  };

  /**
   * Merge two or more maps together into a new map,
   * or simply copy a single map.
   */
  connect.merge = function () {
    var argMaps = Array.prototype.slice.call(arguments, 0);
    var resultMap = {};

    argMaps.forEach(function (map) {
      connect.entries(map).forEach(function (kv) {
        resultMap[kv.key] = kv.value;
      });
    });

    return resultMap;
  };

  connect.now = function () {
    return new Date().getTime();
  };

  connect.find = function (array, predicate) {
    for (var x = 0; x < array.length; x++) {
      if (predicate(array[x])) {
        return array[x];
      }
    }

    return null;
  };

  connect.contains = function (obj, value) {
    if (obj instanceof Array) {
      return connect.find(obj, function (v) { return v === value; }) != null;

    } else {
      return (value in obj);
    }
  };

  connect.containsValue = function (obj, value) {
    if (obj instanceof Array) {
      return connect.find(obj, function (v) { return v === value; }) != null;

    } else {
      return connect.find(connect.values(obj), function (v) { return v === value; }) != null;
    }
  };

  /**
   * Generate a random ID consisting of the current timestamp
   * and a random base-36 number based on Math.random().
   */
  connect.randomId = function () {
    return connect.sprintf("%s-%s", connect.now(), Math.random().toString(36).slice(2));
  };

  /**
   * Generate an enum from the given list of lower-case enum values,
   * where the enum keys will be upper case.
   *
   * Conversion from pascal case based on code from here:
   * http://stackoverflow.com/questions/30521224
   */
  connect.makeEnum = function (values) {
    var enumObj = {};

    values.forEach(function (value) {
      var key = value.replace(/\.?([a-z]+)_?/g, function (x, y) { return y.toUpperCase() + "_"; })
        .replace(/_$/, "");

      enumObj[key] = value;
    });

    return enumObj;
  };

  connect.makeNamespacedEnum = function (prefix, values) {
    var enumObj = connect.makeEnum(values);
    connect.keys(enumObj).forEach(function (key) {
      enumObj[key] = connect.sprintf("%s::%s", prefix, enumObj[key]);
    });
    return enumObj;
  };

  connect.makeGenericNamespacedEnum = function (prefix, values, delimiter) {
    var enumObj = connect.makeEnum(values);
    connect.keys(enumObj).forEach(function (key) {
      enumObj[key] = connect.sprintf("%s"+delimiter+"%s", prefix, enumObj[key]);
    });
    return enumObj;
  };

  /**
  * Methods to determine browser type and versions, used for softphone initialization.
  */
  connect.isChromeBrowser = function () {
    return userAgent.indexOf("Chrome") !== -1;
  };

  connect.isFirefoxBrowser = function () {
    return userAgent.indexOf("Firefox") !== -1;
  };

  connect.isOperaBrowser = function () {
    return userAgent.indexOf("Opera") !== -1;
  };

  connect.getChromeBrowserVersion = function () {
    var chromeVersion = userAgent.substring(userAgent.indexOf("Chrome") + 7);
    if (chromeVersion) {
      return parseFloat(chromeVersion);
    } else {
      return -1;
    }
  };

  connect.getFirefoxBrowserVersion = function () {
    var firefoxVersion = userAgent.substring(userAgent.indexOf("Firefox") + 8);
    if (firefoxVersion) {
      return parseFloat(firefoxVersion);
    } else {
      return -1;
    }
  };

  connect.isValidLocale = function (locale) {
    var languages = [
      {
        id: 'en_US',
        label: 'English'
      },
      {
        id: 'de_DE',
        label: 'Deutsch'
      },
      {
        id: 'es_ES',
        label: 'Español'
      },
      {
        id: 'fr_FR',
        label: 'Français'
      },
      {
        id: 'ja_JP',
        label: '日本語'
      },
      {
        id: 'it_IT',
        label: 'Italiano'
      },
      {
        id: 'ko_KR',
        label: '한국어'
      },
      {
        id: 'pt_BR',
        label: 'Português'
      },
      {
        id: 'zh_CN',
        label: '中文(简体)'
      },
      {
        id: 'zh_TW',
        label: '中文(繁體)'
      }
    ];
    return languages.map(function(language){ return language.id}).includes(locale);
  }

  connect.getOperaBrowserVersion = function () {
    var versionOffset = userAgent.indexOf("Opera");
    var operaVersion = (userAgent.indexOf("Version") !== -1) ? userAgent.substring(versionOffset + 8) : userAgent.substring(versionOffset + 6);
    if (operaVersion) {
      return parseFloat(operaVersion);
    } else {
      return -1;
    }
  };

  /**
   * Return a map of items in the given list indexed by
   * keys determined by the closure provided.
   *
   * @param iterable A list-like object.
   * @param closure A closure to determine the index for the
   *    items in the iterable.
   * @return A map from index to item for each item in the iterable.
   */
  connect.index = function (iterable, closure) {
    var map = {};

    iterable.forEach(function (item) {
      map[closure(item)] = item;
    });

    return map;
  };

  /**
   * Converts the given array into a map as a set,
   * where elements in the array are mapped to 1.
   */
  connect.set = function (arrayIn) {
    var setMap = {};

    arrayIn.forEach(function (key) {
      setMap[key] = 1;
    });

    return setMap;
  };

  /**
   * Returns a map for each key in mapB which
   * is NOT in mapA.
   */
  connect.relativeComplement = function (mapA, mapB) {
    var compMap = {};

    connect.keys(mapB).forEach(function (key) {
      if (!(key in mapA)) {
        compMap[key] = mapB[key];
      }
    });

    return compMap;
  };

  /**
   * Asserts that a premise is true.
   */
  connect.assertTrue = function (premise, message) {
    if (!premise) {
      throw new connect.ValueError(message);
    }
  };

  /**
   * Asserts that a value is not null or undefined.
   */
  connect.assertNotNull = function (value, name) {
    connect.assertTrue(value != null && typeof value !== undefined,
      connect.sprintf("%s must be provided", name || 'A value'));
    return value;
  };

  connect.deepcopy = function (src) {
    return JSON.parse(JSON.stringify(src));
  };

  /**
   * Get the current base url of the open page, e.g. if the page is
   * https://example.com:9494/oranges, this will be "https://example.com:9494".
   */
  connect.getBaseUrl = function () {
    var location = global.location;
    return connect.sprintf("%s//%s:%s", location.protocol, location.hostname, location.port);
  };

  connect.getUrlWithProtocol = function(url) {
    var protocol = global.location.protocol;
    if (url.substr(0, protocol.length) !== protocol) {
      return connect.sprintf("%s//%s", protocol, url);
    }
    return url;
  }

  /**
   * Determine if the current window is in an iframe.
   * Courtesy: http://stackoverflow.com/questions/326069/
   */
  connect.isFramed = function () {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  connect.hasOtherConnectedCCPs = function () {
    return connect.numberOfConnectedCCPs > 1;
  }

  connect.fetch = function (endpoint, options, milliInterval, maxRetry) {
    maxRetry = maxRetry || 5;
    milliInterval = milliInterval || 1000;
    options = options || {};
    return new Promise(function (resolve, reject) {
      function fetchData(maxRetry) {
        fetch(endpoint, options).then(function (res) {
          if (res.status === connect.HTTP_STATUS_CODES.SUCCESS) {
            res.json().then(json => resolve(json)).catch(() => resolve({}));
          } else if (maxRetry !== 1 && (res.status >= connect.HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR || res.status === connect.HTTP_STATUS_CODES.TOO_MANY_REQUESTS)) {
            setTimeout(function () {
              fetchData(--maxRetry);
            }, milliInterval);
          } else {
            reject(res);
          }
        }).catch(function (e) {
          reject(e);
        });
      }
      fetchData(maxRetry);
    });
  };

  /**
   * Calling a function with exponential backoff with full jitter retry strategy
   * It will retry calling the function for maximum maxRetry times if it fails.
   * Success callback will be called if the function succeeded.
   * Failure callback will be called only if the last try failed.
   */
  connect.backoff = function (func, milliInterval, maxRetry, callbacks) {
    connect.assertTrue(connect.isFunction(func), "func must be a Function");
    var self = this;
    var ratio = 2;

    func({
      success: function (data) {
        if (callbacks && callbacks.success) {
          callbacks.success(data);
        }
      },
      failure: function (err, data) {
        if (maxRetry > 0) {
          var interval = milliInterval * 2 * Math.random();
          global.setTimeout(function () {
            self.backoff(func, interval * ratio, --maxRetry, callbacks);
          }, interval);
        } else {
          if (callbacks && callbacks.failure) {
            callbacks.failure(err, data);
          }
        }
      }
    });
  };

  connect.publishMetric = function (metricData) {
    connect.core.getUpstream().sendUpstream(connect.EventType.BROADCAST, {
      event: connect.EventType.CLIENT_METRIC,
      data: metricData
    });
  };

  connect.publishSoftphoneStats = function(stats) {
    connect.core.getUpstream().sendUpstream(connect.EventType.BROADCAST, {
      event: connect.EventType.SOFTPHONE_STATS,
      data: stats
    });
  };

  connect.publishSoftphoneReport = function(report) {
    connect.core.getUpstream().sendUpstream(connect.EventType.BROADCAST, {
      event: connect.EventType.SOFTPHONE_REPORT,
      data: report
    });
  };

  connect.publishClientSideLogs = function(logs) {
    var bus = connect.core.getEventBus();
    bus.trigger(connect.EventType.CLIENT_SIDE_LOGS, logs);
  };

  /**
   * A wrapper around Window.open() for managing single instance popups.
   */
  connect.PopupManager = function () { };

  connect.PopupManager.prototype.open = function (url, name, options) {
    var then = this._getLastOpenedTimestamp(name);
    var now = new Date().getTime();
    var win = null;
    if (now - then > ONE_DAY_MILLIS) {
      if (options) {
        // default values are chosen to provide a minimum height without scrolling
        // and a uniform margin based on the css of the ccp login page
        var height = options.height || DEFAULT_POPUP_HEIGHT;
        var width = options.width || DEFAULT_POPUP_WIDTH;
        var top = options.top || 0;
        var left = options.left || 0;
        win = window.open('', name, "width="+width+", height="+height+", top="+top+", left="+left);
        if (win.location !== url) {
          win = window.open(url, name, "width="+width+", height="+height+", top="+top+", left="+left);
        }
      } else {
        win = window.open('', name);
        if (win.location !== url) {
          win = window.open(url, name);
        }
      }
      this._setLastOpenedTimestamp(name, now);
    }
    return win;
  };

  connect.PopupManager.prototype.clear = function (name) {
    var key = this._getLocalStorageKey(name);
    global.localStorage.removeItem(key);
  };

  connect.PopupManager.prototype._getLastOpenedTimestamp = function (name) {
    var key = this._getLocalStorageKey(name);
    var value = global.localStorage.getItem(key);

    if (value) {
      return parseInt(value, 10);

    } else {
      return 0;
    }
  };

  connect.PopupManager.prototype._setLastOpenedTimestamp = function (name, ts) {
    var key = this._getLocalStorageKey(name);
    global.localStorage.setItem(key, '' + ts);
  };

  connect.PopupManager.prototype._getLocalStorageKey = function (name) {
    return "connectPopupManager::" + name;
  };

  /**
   * An enumeration of the HTML5 notification permission values.
   */
  var NotificationPermission = connect.makeEnum([
    'granted',
    'denied',
    'default'
  ]);

  /**
   * A simple engine for showing notification popups.
   */
  connect.NotificationManager = function () {
    this.queue = [];
    this.permission = NotificationPermission.DEFAULT;
  };

  connect.NotificationManager.prototype.requestPermission = function () {
    var self = this;
    if (!("Notification" in global)) {
      connect.getLog().warn("This browser doesn't support notifications.").sendInternalLogToServer();
      this.permission = NotificationPermission.DENIED;

    } else if (global.Notification.permission === NotificationPermission.DENIED) {
      connect.getLog().warn("The user has requested to not receive notifications.").sendInternalLogToServer();
      this.permission = NotificationPermission.DENIED;

    } else if (this.permission !== NotificationPermission.GRANTED) {
      global.Notification.requestPermission().then(function (permission) {
        self.permission = permission;
        if (permission === NotificationPermission.GRANTED) {
          self._showQueued();

        } else {
          self.queue = [];
        }
      });
    }
  };

  connect.NotificationManager.prototype.show = function (title, options) {
    if (this.permission === NotificationPermission.GRANTED) {
      return this._showImpl({ title: title, options: options });

    } else if (this.permission === NotificationPermission.DENIED) {
      connect.getLog().warn("Unable to show notification.")
        .sendInternalLogToServer()
        .withObject({
          title: title,
          options: options
        });

    } else {
      var params = { title: title, options: options };
      connect.getLog().warn("Deferring notification until user decides to allow or deny.")
        .withObject(params)
        .sendInternalLogToServer();
      this.queue.push(params);
    }
  };

  connect.NotificationManager.prototype._showQueued = function () {
    var self = this;
    var notifications = this.queue.map(function (params) {
      return self._showImpl(params);
    });
    this.queue = [];
    return notifications;
  };

  connect.NotificationManager.prototype._showImpl = function (params) {
    var notification = new global.Notification(params.title, params.options);
    if (params.options.clicked) {
      notification.onclick = function () {
        params.options.clicked.call(notification);
      };
    }
    return notification;
  };

  connect.BaseError = function (format, args) {
    global.Error.call(this, connect.vsprintf(format, args));
  };
  connect.BaseError.prototype = Object.create(Error.prototype);
  connect.BaseError.prototype.constructor = connect.BaseError;

  connect.ValueError = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var format = args.shift();
    connect.BaseError.call(this, format, args);
  };
  connect.ValueError.prototype = Object.create(connect.BaseError.prototype);
  connect.ValueError.prototype.constructor = connect.ValueError;

  connect.NotImplementedError = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var format = args.shift();
    connect.BaseError.call(this, format, args);
  };
  connect.NotImplementedError.prototype = Object.create(connect.BaseError.prototype);
  connect.NotImplementedError.prototype.constructor = connect.NotImplementedError;

  connect.StateError = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var format = args.shift();
    connect.BaseError.call(this, format, args);
  };
  connect.StateError.prototype = Object.create(connect.BaseError.prototype);
  connect.StateError.prototype.constructor = connect.StateError;

  connect.VoiceIdError = function(type, message, err){
    var error = {};
    error.type = type;
    error.message = message;
    error.stack = Error(message).stack;
    error.err = err;
    return error;
  }

  // internal use only
  connect.isCCP = function () {
    var conduit = connect.core.getUpstream();
    return conduit.name === 'ConnectSharedWorkerConduit';
  }
})();

/*
 * Copyright 2014-2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
 
(function () {
  var global = this;
  connect = global.connect || {};
  global.connect = connect;
  global.globalConnect = {}
  global.lily = connect;

  globalConnect.Container = null;

  var FRAME_DIMENSIONS = "margin: 0; border: 0; padding: 0px; width: 0px; height: 0px";


  var LATEST_STREAMJS_CODE = window.atob(LATEST_STREAMJS_BASE64_CODE);


  /**
   Connect instance container
   It holds the connect api context within an iframe window.

   usage:
   var newContainer = new Container({ccpUrl: "bla", ...})
   */
  var Container = function(resource) {
      this.region = resource.region;
      this.id = this.region.replace(/-/g, '_');
      this.height = resource.height;
      this.style = resource.iframe_style; 
      this.ccp = this._createFramedCcp(JSON.stringify(resource));
  };

  Container.prototype._createFramedCcp = function (resource) {
    var permission = permission || "microphone; autoplay";
    var style = this.style || FRAME_DIMENSIONS;
    var iframe = document.createElement('iframe');
    iframe.srcdoc = this.getContent(resource);
    iframe.allow = permission;
    iframe.id = this.id;
    iframe.style = style;
    iframe.scrolling = "no";
    return iframe; 
  };

  Container.prototype.getContent = function(resource){
     return [
       "<!DOCTYPE html>",
       "<meta charset='UTF-8'>",
       "<html>",
         "<head>",
           "<script type='text/javascript'>",
             LATEST_STREAMJS_CODE,
           "</script>",
         "</head>",
         "<body onload='init()'>",
           "<div id=containerDiv style='width: 100%;height: " + this.height + "'></div>",
           "<script type='text/javascript'>",
             "function init() {",
               "connect.core.initCCP(containerDiv," + resource + ");",
            "}",
           "</script>",
         "</body>",
       "</html>"
     ].join('');
   };

  globalConnect.Container = Container;
})();
/*
 * Copyright 2014-2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Note: load utils before core.js
 */

 (function () {
    var global = this;
    connect = global.connect || {};
    globalConnect = global.globalConnect || {};
    global.connect = connect;
    global.globalConnect = globalConnect;
    global.lily = connect;

    connect.core = {};
    globalConnect.core = {regions: {}};
     
    var IFRAME_STYLE = "margin: 0; border: 0; padding:0px;width: 0px;height: 0px";
    var GLOBALIFRAME_STYLE = "margin: 0; border: 0; padding:0px;width: 100%;height: 100%";
    var DIV_DEFAULT_HEIGHT = {
      height: "465px"
    }
    var uiFailoverEnabled = true;

    var extractCcpRegionParams = function (globalContainerDiv, paramsIn) {
      connect.assertNotNull(paramsIn.standByRegion, 'ccpBackupResource');
      connect.assertNotNull(paramsIn.standByRegion.ccpUrl, 'ccpUrl');
      connect.assertNotNull(paramsIn.standByRegion.loginUrl, 'loginUrl');
      connect.assertNotNull(paramsIn.standByRegion.region, 'region');

      var regionAParams = paramsIn;
      var regionBParams = Object.assign({}, paramsIn, {
        ccpUrl: paramsIn.standByRegion.ccpUrl,
        loginUrl: paramsIn.standByRegion.loginUrl,
        region: paramsIn.standByRegion.region
      });

      var divStyle = extractDivStyle(globalContainerDiv);

      if(divStyle.display == "none"){
        uiFailoverEnabled = false;
      }

      if(parseInt(divStyle.height) <= 0){
        globalContainerDiv.style.height = DIV_DEFAULT_HEIGHT.height;  // populating ccp
        divStyle.height = DIV_DEFAULT_HEIGHT.height
      }

      return [regionAParams, regionBParams].map(function(params) {
        connect.assertNotNull(params.ccpUrl, 'ccpUrl');
        connect.assertNotNull(params.loginUrl, 'loginUrl');
        connect.assertNotNull(params.region, 'region');
        delete(params.standByRegion);
        params.loginPopup = false;
        //signal CCP as part of a disaster recovery fleet
        params.disasterRecoveryOn = true;
        params.iframe_style = IFRAME_STYLE;
        params.height = divStyle.height;
        return params
      });
    }; 
    
    var extractDivStyle = function(globalContainerDiv){
      var style = window.getComputedStyle(globalContainerDiv);
      return {
        height: style.getPropertyValue('height'),
        width: style.getPropertyValue('width'),
        display: style.getPropertyValue('display')
      }
    }

    var validateRegion = function(region, availableRegions) {
      connect.assertTrue(typeof region == "string", "Region provided " + region + " is not a valid string");
      var regions = availableRegions || globalConnect.core.regions; 
      if (!regions.hasOwnProperty(region)) {
        var message = "Region provided " + region + " is not found!";
        throw new connect.ValueError(message);
      }
    };

 
    globalConnect.core.initCCP = function (globalContainerDiv, paramsIn) {
      connect.assertNotNull(paramsIn.getPrimaryRegion, 'getPrimaryRegion');
      connect.assertTrue(connect.isFunction(paramsIn.getPrimaryRegion), 'getPrimaryRegion must be a function');
      var getPrimaryRegionFunc = paramsIn.getPrimaryRegion;
      delete(paramsIn.getPrimaryRegion);

      var dualCcpResources = extractCcpRegionParams(globalContainerDiv, paramsIn);
      getPrimaryRegionFunc(function(primaryRegion) {
        var regions = dualCcpResources.reduce(function(obj, resource) {
            obj[resource.region] = null;
            return obj;
          }, {}); 
        validateRegion(primaryRegion, regions);     

        var containers = dualCcpResources.map(function(resource) {
          if (resource.region === primaryRegion) {
            resource.isPrimary = true;
          }
          return new globalConnect.Container(resource);
        });

        //Create global Iframe and attach ccp containers
        var ccpIframes = containers.map(function(container) {return container.ccp.outerHTML});
        var globalIframe = document.createElement('iframe');
        globalIframe.style = GLOBALIFRAME_STYLE;
        globalIframe.id = "globalCCP";
        globalIframe.scrolling = "no";

        // surface single instance connect api in main window
        globalIframe.onload = function () {

          if(uiFailoverEnabled){
            var secondaryRegion = Object.keys(regions).find(function(region){
              return region != primaryRegion 
            });
            
            activateUI(primaryRegion, globalIframe.id);
            deactivateUI(secondaryRegion,globalIframe.id);
          }
          containers.map(function(container) {
            globalConnect.core.regions[container.region] = globalIframe.contentDocument.getElementById(container.id).contentWindow.connect;           
            //listen to failover state change from other window
             var regionalConnect = globalConnect.core.regions[container.region];
             regionalConnect.core.getUpstream().onUpstream(regionalConnect.DisasterRecoveryEvents.FAILOVER, function(data) {
               if (data.isPrimary) {
                 connect = regionalConnect;
                 primaryRegion = connect.core.region;
                 if(uiFailoverEnabled){
                  activateUI(primaryRegion, globalIframe.id);
                 }
               }
               else if(uiFailoverEnabled){
                secondaryRegion = regionalConnect.core.region;
                deactivateUI(secondaryRegion, globalIframe.id);
               }
             });
          });
          connect = globalConnect.core.regions[primaryRegion];
        };

        globalIframe.srcdoc = ccpIframes.join("");
        globalContainerDiv.appendChild(globalIframe);       
      }, function() {
        console.log("[Disaster Recovery] An error occured, while attempting to retrieve your primary region;");
      }); 
    };

    var deactivateUI = function(regionID, globalIframeID) {
      regionID = regionID.replace(/-/g, '_');
      var renderedGlobalIframe = document.getElementById(globalIframeID);
      renderedGlobalIframe.contentDocument.getElementById(regionID).style = "height: 0; width: 0; border: 0px";
    }
 
    var activateUI = function(regionID, globalIframeID) {
      regionID = regionID.replace(/-/g, '_');
      var renderedGlobalIframe = document.getElementById(globalIframeID);
      renderedGlobalIframe.contentDocument.getElementById(regionID).style = "height:800px;width:100%;border:0px";
    }
    
    var getFailoverRegion = function(primaryRegion) {
      var primaryRegion = primaryRegion || connect.core.region;
      return Object.keys(globalConnect.core.regions).find(function(r) {return r !== primaryRegion});
    };

    globalConnect.core.failover = function() {
      globalConnect.core.failoverTo(getFailoverRegion());
    };

    globalConnect.core.failoverTo = function(electedNewPrimaryRegion) {
      validateRegion(electedNewPrimaryRegion);
      var currentPrimaryRegion = getFailoverRegion(electedNewPrimaryRegion);
      deactivate(currentPrimaryRegion);
      activate(electedNewPrimaryRegion);
      connect = globalConnect.core.regions[electedNewPrimaryRegion];
    };

    /**-------------------------------------------------------------------------
    * Deactivates a region
    */
    var deactivate = function (region) {
      var connect = globalConnect.core.regions[region];
      connect.getLog().info("[Disaster Recovery] Deactivating %s region.", connect.core.region)
        .sendInternalLogToServer();
      // call this to suppress contacts 
      connect.core.suppressContacts(true);
      connect.core.forceOffline();
    };

    /**-------------------------------------------------------------------------
    * Activates Stand-by region on failover using suppress==false event
    */
    var activate = function (region) {
      var connect = globalConnect.core.regions[region];
      connect.getLog().info("[Disaster Recovery] Activating %s region.", connect.core.region)
        .sendInternalLogToServer();
      connect.core.suppressContacts(false);
    };
 
     //reference to globalConnect initCCP. This is to mimic the single initialization CCP behavior
    connect.core.initCCP = globalConnect.core.initCCP;
  })();
  