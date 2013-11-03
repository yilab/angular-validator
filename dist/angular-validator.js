(function() {
  var a, validator;

  a = angular.module('validator.directive', []);

  validator = function($injector) {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, element, attrs) {
        var $parse, $validator, match, model, name, rule, ruleNames, rules, validate, _i, _len;
        $validator = $injector.get('$validator');
        $parse = $injector.get('$parse');
        model = $parse(attrs.ngModel);
        rules = [];
        validate = function(from) {
          var result, rule, _i, _len;
          for (_i = 0, _len = rules.length; _i < _len; _i++) {
            rule = rules[_i];
            if (from === 'broadcast') {
              rule.enableError = true;
            }
            model.assign(scope, rule.filter(model(scope)));
            result = rule.validator(model(scope), element, attrs);
            if (!result) {
              return false;
            }
          }
          return true;
        };
        match = attrs.validator.match(RegExp('^/(.*)/$'));
        if (match) {
          rule = $validator.convertRule({
            validator: RegExp(match[1]),
            invoke: attrs.validatorInvoke,
            error: attrs.validatorError
          });
          rules.push(rule);
        }
        match = attrs.validator.match(RegExp('^\\[(.*)\\]$'));
        if (match) {
          ruleNames = match[1].split(',');
          for (_i = 0, _len = ruleNames.length; _i < _len; _i++) {
            name = ruleNames[_i];
            rules.push($validator.getRule(name.trim()));
          }
        }
        scope.$on($validator.broadcastChannel.prepare, function(self, object) {
          if (object.model && attrs.ngModel.indexOf(object.model) !== 0) {
            return;
          }
          return object.accept();
        });
        scope.$on($validator.broadcastChannel.start, function(self, object) {
          if (object.model && attrs.ngModel.indexOf(object.model) !== 0) {
            return;
          }
          if (validate('broadcast')) {
            return object.success();
          } else {
            return object.error();
          }
        });
        return scope.$watch(attrs.ngModel, function(newValue, oldValue) {
          if (newValue === oldValue) {
            return;
          }
          return validate();
        });
      }
    };
  };

  validator.$inject = ['$injector'];

  a.directive('validator', validator);

}).call(this);

(function() {
  angular.module('validator', ['validator.provider', 'validator.directive']);

}).call(this);

(function() {
  var $, a,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  $ = angular.element;

  a = angular.module('validator.provider', []);

  a.provider('$validator', function() {
    var $injector, $q, init, setupProviders,
      _this = this;
    $injector = null;
    $q = null;
    this.rules = {};
    this.broadcastChannel = {
      prepare: '$validateStartPrepare',
      start: '$validateStartStart'
    };
    init = {
      all: function() {
        var x;
        for (x in this) {
          if (x !== 'all') {
            this[x]();
          }
        }
      }
    };
    setupProviders = function(injector) {
      $injector = injector;
      return $q = $injector.get('$q');
    };
    this.convertRule = function(object) {
      var errorMessage, func, regex, result, successFunc;
      if (object == null) {
        object = {};
      }
      /*
      Convert the rule object.
      */

      result = {
        enableError: false,
        invoke: object.invoke,
        filter: object.filter,
        validator: object.validator,
        error: object.error,
        success: object.success
      };
      if (result.invoke == null) {
        result.invoke = [];
      }
      if (result.invoke.constructor === String) {
        result.invoke = result.invoke.split(',');
      }
      if (result.filter == null) {
        result.filter = function(input) {
          return input;
        };
      }
      if (result.validator == null) {
        result.validator = function() {
          return true;
        };
      }
      if (result.error == null) {
        result.error = '';
      }
      result.enableError = __indexOf.call(result.invoke, 'watch') >= 0;
      if (result.error.constructor === String) {
        errorMessage = result.error;
        result.error = function(element, attrs) {
          var index, parent, _i;
          parent = $(element).parent();
          for (index = _i = 1; _i <= 3; index = ++_i) {
            if (parent.hasClass('form-group')) {
              if (parent.hasClass('has-error')) {
                return;
              }
              $(element).parent().append("<label class='control-label error'>" + errorMessage + "</label>");
              parent.addClass('has-error');
              break;
            }
            parent = parent.parent();
          }
        };
      }
      successFunc = function(element, attrs) {
        var index, label, parent, _i, _j, _len, _ref, _results;
        parent = $(element).parent();
        _results = [];
        for (index = _i = 1; _i <= 3; index = ++_i) {
          if (parent.hasClass('has-error')) {
            parent.removeClass('has-error');
            _ref = parent.find('label');
            for (_j = 0, _len = _ref.length; _j < _len; _j++) {
              label = _ref[_j];
              if (!($(label).hasClass('error'))) {
                continue;
              }
              label.remove();
              break;
            }
            break;
          }
          _results.push(parent = parent.parent());
        }
        return _results;
      };
      if (result.success && typeof result.success === 'function') {
        func = result.success;
        result.success = function(element, attrs) {
          func(element, attrs);
          return successFunc(element, attrs);
        };
      } else {
        result.success = successFunc;
      }
      if (result.validator.constructor === RegExp) {
        regex = result.validator;
        result.validator = function(value, element, attrs) {
          if (regex.test(value)) {
            return result.success(element, attrs);
          } else if (result.enableError) {
            return result.error(element, attrs);
          }
        };
      } else if (typeof result.validator === 'function') {
        func = result.validator;
        result.validator = function(value, element, attrs) {
          return $q.all([func(value, element, attrs, $injector)]).then(function(objects) {
            if (objects && objects.length > 0 && objects[0]) {
              return result.success(element, attrs);
            } else if (result.enableError) {
              return result.error(element, attrs);
            }
          });
        };
      }
      return result;
    };
    this.register = function(name, object) {
      if (object == null) {
        object = {};
      }
      /*
      Register the rules.
      @params name: The rule name.
      @params object:
          invoke: ['watch', 'blur'] or undefined(validator by yourself)
          filter: function(input)
          validator: RegExp() or function(value, element, attrs, $injector)
          error: string or function(element, attrs)
          success: function(element, attrs)
      */

      return this.rules[name] = this.convertRule(object);
    };
    this.getRule = function(name) {
      if (this.rules[name]) {
        return this.rules[name];
      } else {
        return null;
      }
    };
    this.validate = function(scope, model) {
      var brocadcastObject, count, deferred, func, promise;
      deferred = $q.defer();
      promise = deferred.promise;
      count = {
        total: 0,
        success: 0,
        error: 0
      };
      func = {
        success: function() {},
        error: function() {},
        accept: function() {
          return count.total++;
        },
        validatedSuccess: function() {
          if (++count.success === count.total) {
            return func.success();
          }
        },
        validatedError: function() {
          if (count.error++ === 0) {
            return func.error();
          }
        }
      };
      promise.success = function(fn) {
        return func.success = fn;
      };
      promise.error = function(fn) {
        return func.error = fn;
      };
      brocadcastObject = {
        model: model,
        accept: func.accept,
        success: func.validatedSuccess,
        error: func.validatedError
      };
      scope.$broadcast(_this.broadcastChannel.prepare, brocadcastObject);
      setTimeout(function() {
        var $validator;
        $validator = $injector.get('$validator');
        return scope.$broadcast($validator.broadcastChannel.start, brocadcastObject);
      }, 0);
      return promise;
    };
    this.get = function($injector) {
      setupProviders($injector);
      init.all();
      return {
        rules: this.rules,
        broadcastChannel: this.broadcastChannel,
        convertRule: this.convertRule,
        getRule: this.getRule,
        validate: this.validate
      };
    };
    this.get.$inject = ['$injector'];
    return this.$get = this.get;
  });

}).call(this);