describe('delegateEvents', function() {
  'use strict';
  var subject, model, Klass, methodSpy;

  beforeEach(function() {
    methodSpy = jasmine.createSpy('method');
    Klass = Backbone.View.extend({method: methodSpy}, Backbone.extensions.include);
    Klass.include(Backbone.extensions.delegateEvents);
    subject = new Klass();
    model = new Backbone.Model({id: 1});
  });

  describe("#delegateEvents", function() {
    var changeSpy;

    beforeEach(function() {
      changeSpy = jasmine.createSpy('change');
      spyOn($.fn, 'on').andCallThrough();
    });

    describe("when it is called with a hash", function() {
      beforeEach(function() {
        subject.delegateEvents({'click div': $.noop});
      });

      it("should call jQuery on for the events", function() {
        expect($.fn.on).toHaveBeenCalled();
      });

      describe("when the hash has a key with an array value", function() {
        var firstSpy, secondSpy;

        beforeEach(function() {
          firstSpy = jasmine.createSpy('first');
          secondSpy = jasmine.createSpy('second');

          subject = new Klass({el: jasmine.content()[0]});
          jasmine.content().append('<div/>');

          subject.delegateEvents({
            'click div': [firstSpy, secondSpy],
            'mouseenter div': 'method'
          });
        });

        it("should delegate both of the callbacks", function() {
          subject.$("div").click();

          expect(firstSpy).toHaveBeenCalled();
          expect(secondSpy).toHaveBeenCalled();
        });

        it('should bind the event with the expected context if it is a string', function() {
          subject.$("div").trigger('mouseenter');
          expect(methodSpy).toHaveBeenCalled();
          expect(methodSpy.mostRecentCall.object).toEqual(subject);
        });
      });
    });

    describe("when it is called with a tuple", function() {
      describe("when the subject is not a jquery", function() {
        var resetSpy1, resetSpy2, context = {};

        beforeEach(function() {
          resetSpy1 = jasmine.createSpy('resetSpy1');
          resetSpy2 = jasmine.createSpy('resetSpy2');
          spyOn(subject, 'undelegateEvents').andCallThrough();
          subject.delegateEvents([model, {change: changeSpy, reset: [resetSpy1, resetSpy2], add: 'method'}, context]);
        });

        it('should call undelegate events', function() {
          expect(subject.undelegateEvents).toHaveBeenCalled();
        });

        it("should bind backbone events", function() {
          model.trigger('change');
          expect(changeSpy).toHaveBeenCalled();
        });

        it("should bind backbone callbacks that are supplied as an array with the expected context", function() {
          model.trigger('reset');
          expect(resetSpy1).toHaveBeenCalled();
          expect(resetSpy1.mostRecentCall.object).toEqual(context);
          expect(resetSpy2).toHaveBeenCalled();
          expect(resetSpy2.mostRecentCall.object).toEqual(context);
        });

        it('should bind the event with the expected context if it is a string', function() {
          model.trigger('add');
          expect(methodSpy).toHaveBeenCalled();
          expect(methodSpy.mostRecentCall.object).toEqual(context);
        });

        it("should be resilient against null backbone objects", function() {
          expect(function() {
            subject.delegateEvents([null, {change: $.noop}]);
          }).not.toThrow();
        });
      });
    });

    describe("when it is called with a hash and a tuple", function() {
      beforeEach(function() {
        subject.delegateEvents({'click div': $.noop}, [model, {change: changeSpy}]);
      });

      it("should call jQuery on for the events", function() {
        expect($.fn.on).toHaveBeenCalled();
      });

      it("should bind backbone events", function() {
        model.trigger('change');
        expect(changeSpy).toHaveBeenCalled();
      });
    });
  });

  describe("#undelegateEvents", function() {
    var changeSpy;

    beforeEach(function() {
      changeSpy = jasmine.createSpy('change');
      subject.delegateEvents([model, {change: changeSpy}]);
      subject.undelegateEvents();
    });

    it("should remove backbone events", function() {
      model.trigger('change');
      expect(changeSpy).not.toHaveBeenCalled();
    });

    describe('for typical Backbone view event bindings', function() {
      beforeEach(function() {
        jasmine.content().append('<div/>');
      });
      it('should unbind the events', function() {
        var clickSpy = jasmine.createSpy('clickSpy');
        subject = new Klass({el: jasmine.content()[0]});
        jasmine.content().append('<div/>');
        subject.delegateEvents({
          'click div': clickSpy
        });
        subject.undelegateEvents();
        subject.$("div").click();
        expect(clickSpy).not.toHaveBeenCalled();
      });
    
    });
  });

  describe("#remove", function() {
    it("should call undelegate events", function() {
      spyOn(subject, 'undelegateEvents').andCallThrough();
      subject.remove();
      expect(subject.undelegateEvents).toHaveBeenCalled();
    });
  });
});
