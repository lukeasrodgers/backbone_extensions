(function() {
  'use strict';
  var exports = this, _ = exports._, Backbone = exports.Backbone;

  function noop() {}

  var EventDelegator = function(params) {
    this.listener = params.listener;
    this.events = params.events;
    this.delegateViewEvents = params.delegateViewEvents;
    this.oldUndelegateEvents = this.listener.undelegateEvents;
    this.delegateEvents();
  };

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
    _delegateEvents: function() {
      var events = this.events;
      var delegateViewEvents = this.delegateViewEvents;
      var self = this.listener;
      _.chain(events).toArray().compact().each(function(obj) {
        var arg = _(obj);
        if (arg.isArray()) {
          bindModelEvents.call(self, obj);
        } else {
          arg.each(function(callbacks, event) {
            _.chain([callbacks]).flatten().each(function(callback) {
              delegateViewEvents.call(self, _.tap({}, function(obj) {
                obj[event] = callback;
              }));
            });
          });
        }
      });
    }
  });

  function bindModelEvents(tuple) {
    var self = this, subject = tuple[0], eventNames = tuple[1], isJquery = !!_(subject).result('jquery'),
        modelEvents = self._modelCallbacks, context = tuple[2];
    modelEvents.push(tuple);
    _.each(subject && eventNames, function(callback, event) {
      _.each(event.split(' '), function(e) {
        _.chain([callback]).flatten().each(function(c) {
          var fn = _.isFunction(c) ? c : self[c];
          if (isJquery) {
            if (context) {
              subject.on(e, context, fn);
            } else {
              subject.on(e, fn);
            }
          } else {
            subject.on(e, fn, context);
          }
        });
      });
    });
  }

  function unbindModelEvents() {
    var self = this, modelEvents = self._modelCallbacks;
    _.each(modelEvents, function(tuple) {
      var subject = tuple[0], events = tuple[1], context = tuple[2], isJquery = !!_.result(subject, 'jquery');
      _.each(subject && events, function(callback, event) {
        _.each(event.split(' '), function(e) {
          _.chain([callback]).flatten().each(function(c) {
            var fn = _.isFunction(c) ? c : self[c];
            if (isJquery) {
              if (context) {
                subject.off(e, context, fn);
              } else {
                subject.off(e, fn);
              }
            } else {
              subject.off(e, fn);
            }
          });
        });
      });
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
