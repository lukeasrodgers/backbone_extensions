(function() {
  'use strict';
  var exports = this, _ = exports._, Backbone = exports.Backbone;

  function noop() {}

  function EventDelegator(params) {
    this.listener = params.listener;
    this.events = params.events;
    this.delegateViewEvents = params.delegateViewEvents;
    this.oldUndelegateEvents = this.listener.undelegateEvents;
    this.delegateEvents();
  }

  _.extend(EventDelegator.prototype, {
    delegateEvents: function() {
      this.undelegateEvents();
      this.temporarilyDisableUndelegation();
      this._delegateEvents();
      this.restoreUndelegation();
    },
    undelegateEvents: function() {
      this.listener.undelegateEvents();
    },
    temporarilyDisableUndelegation: function() {
      this.listener.undelegateEvents = noop;
    },
    restoreUndelegation: function() {
      this.listener.undelegateEvents = this.oldUndelegateEvents;
    },
    customBindEvents: function(tuple) {
      var modelEvents = this.listener._modelCallbacks;
      modelEvents.push(tuple);
      new EventBinder({listener: this.listener, tuple: tuple});
    },
    _delegateEvents: function() {
      var events = this.events;
      var delegateViewEvents = this.delegateViewEvents;
      var self = this,
          listener = this.listener;
      _.chain(events).toArray().compact().each(function(obj) {
        var arg = _(obj);
        if (arg.isArray()) {
          self.customBindEvents(obj);
        } else {
          arg.each(function(callbacks, event) {
            _.chain([callbacks]).flatten().each(function(callback) {
              delegateViewEvents.call(listener, _.tap({}, function(obj) {
                obj[event] = callback;
              }));
            });
          });
        }
      });
    }
  });

  function EventHandler(params) {
    this.listener = params.listener;
    var tuple = params.tuple;
    this.subject = tuple[0];
    this.eventNames = tuple[1];
    this.context = tuple[2];
    this.parse();
  }
  _.extend(EventHandler.prototype, {
    parse: function() {
      var listener = this.listener;
      var self = this;
      _.each(this.subject && this.eventNames, function(callback, event) {
        _.each(event.split(' '), function(e) {
          _.chain([callback]).flatten().each(function(c) {
            var fn = _.isFunction(c) ? c : listener[c];
            self.handle(e, fn);
          });
        });
      });
    },
    isJquery: function() {
      return !!_(this.subject).result('jquery');
    },
    handle: function(e, fn) {
      var handler = this.methodName;
      if (this.isJquery()) {
        if (this.context) {
          this.subject[handler](e, this.context, fn);
        } else {
          this.subject[handler](e, fn);
        }
      } else {
        this.subject[handler](e, fn, this.context);
      }
    }
  });

  function EventBinder() {
    EventHandler.apply(this, arguments);
  }
  _.extend(EventBinder.prototype, EventHandler.prototype, {
    methodName: 'on'
  });

  function EventUnbinder() {
    EventHandler.apply(this, arguments);
  }
  _.extend(EventUnbinder.prototype, EventHandler.prototype, {
    methodName: 'off'
  });

  function unbindModelEvents() {
    var self = this, modelEvents = self._modelCallbacks;
    _.each(modelEvents, function(tuple) {
      new EventUnbinder({listener: self, tuple: tuple});
    });
  }

  var delegateEvents = {
    included: function(source) {
      _.extend(source.prototype, {
        initialize: _.wrap(source.prototype.initialize, function(oldInitialize, attrsOrModels, options) {
          this._modelCallbacks = [];
          oldInitialize.call(this, attrsOrModels, options);
        }),

        delegateEvents: _.wrap(source.prototype.delegateEvents, function(oldDelegateEvents) {
          var self = this, args = _.rest(arguments);
          if (!args.length) {
            return oldDelegateEvents.call(this);
          }
          new EventDelegator({
            delegateViewEvents: oldDelegateEvents,
            listener: self,
            events: args
          });

        }),

        undelegateEvents: _.wrap(source.prototype.undelegateEvents, function(oldUndelegateEvents) {
          unbindModelEvents.call(this);
          return oldUndelegateEvents.call(this);
        }),

        remove: _.wrap(source.prototype.remove, function(oldRemove) {
          this.undelegateEvents();
          return oldRemove.call(this);
        })
      });
    }
  };

  Backbone.extensions = _.extend(Backbone.extensions || {}, {delegateEvents: delegateEvents});
}).call(this);
