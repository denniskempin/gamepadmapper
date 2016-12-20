'use strict';

var doneMessage = 'All done. Please copy and paste the contents of the text ' + 
                  'area below and send them to denniskempin@chromium.org.';

// Maps button IDs to their display names
var buttonNames = [
  'A', 'B', 'X', 'Y', 
  'Left Shoulder', 'Right Shoulder',
  'Left Trigger', 'Right Trigger',
  'Select / Back', 'Start / Forward',
  'Press Left Analog Stick', 'Press Right Analog Stick',
  'DPad Up', 'DPad Down', 'DPad Left', 'Dpad Right',
  'Logo Button'
];


// Maps axis IDs to their display names
var axesNames = [
  'Left Analog Stick Horizontal', 'Left Analog Stick Vertical',
  'Right Analog Stick Horizontal', 'Right Analog Stick Vertical',
];


// Keeps track of current state of mapping flow
class MappingState {
  constructor(mappingSteps) {
    this.mappingSteps = mappingSteps;
    this.reset();
  }

  reset() {
    this.mappings = this.mappingSteps.map(mapping => Object.assign({}, mapping, {mapsTo: {}}));
    this.currentStep = 0;
    this.dirty = true;
    this.waitToClear = true;
  }

  skip() {
    this.expectNotDone();
    this.currentStep++;
    this.dirty = true;
  }
  
  back() {
    this.currentStep--;
    this.dirty = true;
  }

  gamepadCleared() {
    this.waitToClear = false;
    this.dirty = true;
  }

  done() {
    this.currentStep = this.mappings.length;
    this.dirty = true;
  }

  isDone() {
    return this.currentStep >= this.mappings.length;
  }

  expectNotDone() {
    if (this.isDone()) {
      throw 'Cannot access after calibration is done.'
    }
  }

  setCurrentStepMapping(mapping) {
    this.expectNotDone();
    this.mappings[this.currentStep].mapsTo = mapping;
    this.currentStep++;
    this.dirty = true;
    this.waitToClear = true;
  }

  getCurrentStepName() {
    this.expectNotDone();
    return this.mappings[this.currentStep].name;
  }

  get humanReadableMapping() {
    var result = '';
    for (var mapping of this.mappings) {
      console.log(mapping)
      result += `<strong>${mapping.name}: </strong>`
      if (mapping.mapsTo.button != undefined)
        result += 'Button ' + mapping.mapsTo.button.toString();
      if (mapping.mapsTo.axis != undefined)
        result += 'Axis ' + mapping.mapsTo.axis.toString();
      result += '<br>\n';
    }
    return result;
  }
}


// Manages UI and functionality of mapping process
class MappingView {
  constructor(mappingState, pollFrequency) {
    this.gamepad = undefined;
    this.data = mappingState;

    $('#btn-skip').click(this.data, (e) => e.data.skip());
    $('#btn-reset').click(this.data, (e) => e.data.reset());
    $('#btn-back').click(this.data, (e) => e.data.back());
    $('#btn-done').click(this.data, (e) => e.data.done());
    
    setInterval(self => self.onPoll(), pollFrequency, this);
    this.onUpdateView()
  }

  onSkip() {
    console.log('onSkip');
    this.data.skip()
  }

  onUpdateView() {
    console.log('onUpdateView');
    
    if (this.gamepad) {
      $('#id').text(this.gamepad.id);
      $('#btn-reset').attr('disabled', this.data.currentStep == 0);
      $('#btn-back').attr('disabled', this.data.currentStep == 0);
      $('#btn-skip').attr('disabled', this.data.isDone());
      $('#btn-done').attr('disabled', this.data.isDone());
      
      $('#mapping').html(this.data.humanReadableMapping);

      if (this.data.isDone()) {
        $('#instruction').text(doneMessage);
        $('#results').show();
        var data = {id: this.gamepad.id, mappings: this.data.mappings}
        $('#results').text(JSON.stringify(data, null, 2));
      } else {
        if (this.data.waitToClear) {
          $('#instruction').text('Release all buttons and center all axes');
        } else {
          $('#instruction').text('Press ' + this.data.getCurrentStepName());
        }
        $('#results').hide();
      }
    } else {
      $('#id').text('No connection.');
      $('#instruction').text('');
      $('#mapping').html('');
      $('#btn-reset').attr('disabled', true);
      $('#btn-back').attr('disabled', true);
      $('#btn-skip').attr('disabled', true);
      $('#btn-done').attr('disabled', true);
      $('#results').hide();
    }
  }

  getActiveButtonOrAxis() {
    for (var i = 0; i < this.gamepad.buttons.length; ++i) {
      if (this.gamepad.buttons[i].pressed) {
        return { 'button': i };
      }
    }
    for (var i = 0; i < this.gamepad.axes.length; ++i) {
      if (this.gamepad.axes[i] > 0.8) {
        return { 'axis': i + '+' };
      }
      if (this.gamepad.axes[i] < -0.8) {
        return { 'axis': i + '-' };
      }
    }
    return undefined;
  }

  onPoll() {
    var gamepad = navigator.getGamepads()[0];
    if (gamepad != this.gamepad) {
      this.gamepad = gamepad;
      this.data.reset();
    }

    if (this.gamepad && !this.data.isDone()) {
      var activeButtonOrAxis = this.getActiveButtonOrAxis()
      if (this.data.waitToClear) {
        if (activeButtonOrAxis == undefined) {
          this.data.gamepadCleared()
        }
      } else if (activeButtonOrAxis != undefined) {
        this.data.setCurrentStepMapping(activeButtonOrAxis);
      }
    }

    if (this.data.dirty) {
      this.onUpdateView();
      this.data.dirty = false;
    }
  }
}

var mappingSteps = [];
for (var buttonId in buttonNames)
  mappingSteps.push({button: buttonId, name: 'Button ' + buttonNames[buttonId]});
for (var axisId in axesNames)
  mappingSteps.push({axis: axisId, name: 'Axis ' + axesNames[axisId]});

var mappingState = new MappingState(mappingSteps);
var mappingView = new MappingView(mappingState, 50);
