// @ts-nocheck
let config = {};
const selection: SceneNode = figma.currentPage.selection[0];

if (figma.currentPage.selection.length === 1) {
  if (selection.type === 'FRAME') {
    let frameWidth = figma.currentPage.selection[0].width;
    let frameHeight = figma.currentPage.selection[0].height;
    let zoneCount = 0;
  
    for (const groupName of Object.keys(figma.currentPage.selection[0].children)) {
      if (selection.children[groupName].type === "GROUP") {
        zoneCount++;
        let zone = selection.children[groupName]
        let zoneName = zone.name
        config[zoneName + '_' + zoneCount] = {
          'title': zoneName,
          'item_type': "ITEM_TYPE.single",
          'items': {}
        };
  
        let deviceCount = 0;
        for (const device of zone.children) {
          
          if (device.type === "INSTANCE" && device.visible === true) {
            deviceCount++;
            let deviceName = device.name;
            config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount] = {
              'title': deviceName,
              'items': {}
            };
  
            if (device.mainComponent.name === 'multisensor') {
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['item_type'] = 'ITEM_TYPE.single';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['param_type'] = 'PARAM_TYPE.value';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['custom_data'] = {
                'template': 'multisensorTemplate',
                'top': (device.y / frameHeight) * 100,
                'left': (device.x / frameWidth) * 100,
                'placement': 'auto'
              }
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount].items = {
                'temperature': {
                  'title': 'Temperature'
                },
                'humidity': {
                  'title': 'Humidity'
                },
                'noise': {
                  'title': 'Noise'
                },
                'co2': {
                  'title': 'CO2'
                },
                'lighting': {
                  'title': 'Lighting'
                }
              }
            }
  
            if (device.mainComponent.name === 'reedswitch') {
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['item_type'] = 'ITEM_TYPE.single';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['param_type'] = 'PARAM_TYPE.signal';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['custom_data'] = {
                'template': 'reedSwitchTemplate',
                'top': (device.y / frameHeight) * 100,
                'left': (device.x / frameWidth) * 100,
                'placement': 'auto'
              }
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount].items = {
                'reed_switch': {
                  'title': 'Reed switch'
                }
              }
            }
  
            if (device.mainComponent.name === 'door') {
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['item_type'] = 'ITEM_TYPE.single';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['param_type'] = 'PARAM_TYPE.signal';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['custom_data'] = {
                'template': 'doorStateTemplate',
                'top': (device.y / frameHeight) * 100,
                'left': (device.x / frameWidth) * 100,
                'placement': 'auto'
              }
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount].items = {
                'door_reed_switch': {
                  'title': 'Door state'
                }
              }
            }
  
            if (device.mainComponent.parent.name === 'mnemoscheme/switch') {
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['item_type'] = 'ITEM_TYPE.single';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['param_type'] = 'PARAM_TYPE.signal';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['custom_data'] = {
                'template': 'mnemoschemeSwitchTemplate',
                'top': (device.y / frameHeight) * 100,
                'left': (device.x / frameWidth) * 100,
                'width': device.width,
                'rotation_angle': device.rotation,
                'placement': 'auto'
              }
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount].items = {
                'mnemoscheme_switch': {
                  'title': 'Mnemoscheme switch state'
                }
              }
            }
  
            if (device.mainComponent.name === 'camera') {
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['item_type'] = 'ITEM_TYPE.single';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['param_type'] = 'PARAM_TYPE.value';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['custom_data'] = {
                'template': 'cameraTemplate',
                'top': (device.y / frameHeight) * 100,
                'left': (device.x / frameWidth) * 100,
                'placement': 'auto',
                "direction": -(device.rotation)
              }
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount].items = {
                'channel': {
                  'title': 'Channel',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'alarm_state': {
                  'title': 'Alarm state',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.signal'
                },
                'work_state': {
                  'title': 'Work state',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.signal'
                },
                'detect_mask': {
                  'title': 'Detect mask',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.increment'
                },
                'detect_group': {
                  'title': 'Detect applicant and student meeting',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.increment'
                },
              }
            }
  
            if (device.mainComponent.name === 'lightline') {
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['item_type'] = 'ITEM_TYPE.single';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['param_type'] = 'PARAM_TYPE.signal';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['custom_data'] = {
                'template': 'lightLineTemplate',
                'top': (device.y / frameHeight) * 100,
                'left': (device.x / frameWidth) * 100,
                'length': (device.height / frameHeight) * 100,
                'rotation_angle': device.rotation,
                'placement': 'auto'
              }
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount].items = {
                'light_line': {
                  'title': 'Light line'
                }
              }
            }
  
            if (device.mainComponent.name === 'fancoil') {
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['item_type'] = 'ITEM_TYPE.single';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['param_type'] = 'PARAM_TYPE.signal';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['custom_data'] = {
                'template': 'fancoilTemplate',
                'top': (device.y / frameHeight) * 100,
                'left': (device.x / frameWidth) * 100,
                'placement': 'auto'
              }

              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount].items = {
                'speed': {
                  'title': 'Blowing speed',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'operating_mode': {
                  'title': 'Operating mode',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'control_flag': {
                  'title': 'Control flag',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                }
              }
            }
  
            if (device.mainComponent.name === 'ventilation') {
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['item_type'] = 'ITEM_TYPE.single';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['param_type'] = 'PARAM_TYPE.signal';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['custom_data'] = {
                'template': 'ventilationTemplate',
                'top': (device.y / frameHeight) * 100,
                'left': (device.x / frameWidth) * 100,
                'placement': 'auto'
              }
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount].items = {
                'mode': {
                  'title': 'Work mode on/off'
                },
                'error_code': {
                  'title': 'Error code',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'filter_contamination': {
                  'title': 'Filter contamination',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'rotation_speed': {
                  'title': 'Rotation speed',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'temperature_in_channel': {
                  'title': 'Temperature in channel',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                }
              }
            }
  
            if (device.mainComponent.parent.name === 'universal') {
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['item_type'] = 'ITEM_TYPE.single';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['param_type'] = 'PARAM_TYPE.signal';
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount]['custom_data'] = {
                'template': 'universalTemplate',
                'device_type': device.mainComponent.name.match(/=([^ ]*)/)[1],
                'top': (device.y / frameHeight) * 100,
                'left': (device.x / frameWidth) * 100,
                'placement': 'auto',
                'icon_path': device.children[0].mainComponent?.children[0]?.fillGeometry
              };
              config[zoneName + '_' + zoneCount].items[deviceName + '_' + deviceCount].items = {
                'parameter_1': {
                  'title': 'Parameter 1',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'parameter_2': {
                  'title': 'Parameter 2',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'parameter_3': {
                  'title': 'Parameter 3',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'parameter_4': {
                  'title': 'Parameter 4',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'parameter_5': {
                  'title': 'Parameter 5',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'parameter_6': {
                  'title': 'Parameter 6',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'parameter_7': {
                  'title': 'Parameter 7',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'parameter_8': {
                  'title': 'Parameter 8',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'parameter_9': {
                  'title': 'Parameter 9',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                },
                'parameter_10': {
                  'title': 'Parameter 10',
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                }
              }
            }
          }
        }
      }
      
      console.log(config);
    }

  } else {
    figma.notify('Selection is not a frame. Please select one frame.');
    figma.closePlugin();
  }
} else {
  figma.notify('Please select only one frame to run plugin.');
  figma.closePlugin();
}


/**
 * @name activateUtilitiesUi
 * @description activates the utilities ui to run utility functions
 */
const activateUtilitiesUi = () => {
  // register the utilities UI (hidden by default)
  figma.showUI(__html__, { visible: false });
}

// ---------------------------------
// EXPORT TO FILE
// exports the device configration to a file
if (figma.command === 'export') {
  // activete utilities UI
  activateUtilitiesUi();
  // write tokens to json file
  figma.ui.postMessage({
    command: 'export',
    data: {
      filename: `plan_configuration.json`,
      data: JSON.stringify(config)
    } 
  })
}

// HELP
// Open github help page
if (figma.command === 'help') {
  activateUtilitiesUi()
  figma.ui.postMessage({
    command: 'help'
  })
}

// CLOSE PLUGIN
figma.ui.onmessage = async (message) => {
  if (message.command === 'closePlugin') {
    // show notification if send
    if (message.notification !== undefined && message.notification !== '') {
      figma.notify(message.notification)
    }
    // close plugin
    // console.log('Figma Plugin does not close')
    figma.closePlugin()
  }
}
