import json
import sys 
import re

BUTTON_NAMES = [
  "BUTTON_INDEX_PRIMARY",
  "BUTTON_INDEX_SECONDARY",
  "BUTTON_INDEX_TERTIARY",
  "BUTTON_INDEX_QUATERNARY",
  "BUTTON_INDEX_LEFT_SHOULDER",
  "BUTTON_INDEX_RIGHT_SHOULDER",
  "BUTTON_INDEX_LEFT_TRIGGER",
  "BUTTON_INDEX_RIGHT_TRIGGER",
  "BUTTON_INDEX_BACK_SELECT",
  "BUTTON_INDEX_START",
  "BUTTON_INDEX_LEFT_THUMBSTICK",
  "BUTTON_INDEX_RIGHT_THUMBSTICK",
  "BUTTON_INDEX_DPAD_UP",
  "BUTTON_INDEX_DPAD_DOWN",
  "BUTTON_INDEX_DPAD_LEFT",
  "BUTTON_INDEX_DPAD_RIGHT",
  "BUTTON_INDEX_META",
  "BUTTON_INDEX_COUNT"
]

AXES_NAMES = [
  "AXIS_INDEX_LEFT_STICK_X",
  "AXIS_INDEX_LEFT_STICK_Y",
  "AXIS_INDEX_RIGHT_STICK_X",
  "AXIS_INDEX_RIGHT_STICK_Y",
  "AXIS_INDEX_COUNT"
]

data = json.load(open(sys.argv[1]))

def get_vid(data):
  match = re.search('Vendor\: ([0-9a-fA-F]+)', data['id'])
  return match.group(1)

def get_pid(data):
  match = re.search('Product\: ([0-9a-fA-F]+)', data['id'])
  return match.group(1)

def get_name(data):
  match = re.search('[^\(]+', data['id'])
  return match.group(0)

print 'Table entry:'
print '    {"%s", "%s", MapperRenameMe}, // %s' % (get_vid(data), get_pid(data), get_name(data))
print ''
print 'Mapping method:'
print 'void MapperRenameMe(const blink::WebGamepad& input, blink::WebGamepad* mapped) {'
print '  *mapped = input;'

for mapping in data['mappings']:
  button = int(mapping['button']) if 'button' in mapping else None
  axis = int(mapping['axis']) if 'axis' in mapping else None 
  mapToButton =  mapping['mapsTo'].get('button', None)
  mapToAxis =  mapping['mapsTo'].get('axis', None)
  mapToAxisId = int(mapToAxis[0]) if mapToAxis is not None else None
  mapToAxisPositive = mapToAxis[1] == '+' if mapToAxis is not None else None

  if button is not None:    
    buttonName = BUTTON_NAMES[button]
    if mapToButton is not None:
      if button != mapToButton:
        print "  mapped->buttons[%s] = input.buttons[%d];" % (buttonName, mapToButton) 
      buttonsLength = button + 1;
    elif mapToAxis is not None:
      method = 'AxisPositiveAsButton' if mapToAxisPositive else 'AxisNegativeAsButton'
      print "  mapped->buttons[%s] = %s(input.axes[%d]);" % (buttonName, method, mapToAxisId) 
      buttonsLength = button + 1;
    else:
      print "  mapped->buttons[%s] = NullButton();" % (buttonName, )
  elif axis is not None:
    axisName = AXES_NAMES[axis]
    if mapToAxis is not None:
      if axis != mapToAxisId:
        print "  mapped->axis[%s] = input.axes[%d];" % (axisName, mapToAxis)
      axesLength = axis + 1;
  else:
    raise "Neither button nor axis? Malformed mapping."

print '  mapped->buttonsLength = %s' % (BUTTON_NAMES[buttonsLength], );
print '  mapped->axesLength = %s' % (AXES_NAMES[axesLength], );
print '}'