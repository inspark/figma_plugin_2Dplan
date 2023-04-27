// @ts-nocheck
let config = {};
let settings = {};
// const selection: SceneNode = figma.currentPage.selection[0];

function isJsonString(str) {
  try {
      JSON.parse(str);
  } catch (e) {
      return false;
  }
  return true;
}

function figmaRGBToWebRGB(color): any {
  const rgb = [];
  const namesRGB = ['r', 'g', 'b'];

  namesRGB.forEach((e, i) => {
    rgb[i] = Math.round(color[e] * 255)
  })

  if (color['a'] !== undefined) rgb[3] = Math.round(color['a'] * 100) / 100
  return rgb
}

function generateConfig(selection: any) {
  return new Promise(function(resolve, reject) {
    if (selection.length === 1) {
      if (selection[0].type === 'FRAME') {
        let frameWidth = selection[0].width;
        let frameHeight = selection[0].height;
        let zoneCount = 0;

        for (const groupName of Object.keys(selection[0].children)) {
          if (selection[0].children[groupName].type === "GROUP") {
            
            let zone = selection[0].children[groupName];
            let zoneId = 'zone' + '_' + zone.id;
            let zoneName = zone.name;
            config[zoneId] = {
              'title': zoneName,
              'item_type': "ITEM_TYPE.single",
              'items': {}
            };
    
            config[zoneId]['custom_data'] = {
              'title': zoneName,
            }
      
            let deviceCount = 0;

            for (const device of zone.children) {
              
              if (device.type === "INSTANCE" && device.visible === true) {
                deviceCount++;
    
    
                // В качестве названий объекта используется id элемета из Figma + название компонента.
                // Для обеспечения совместимости с файлом figma предыдущей версии добавлена проверка parent

                let deviceId = '';

                if ( device.mainComponent.parent.type === "COMPONENT_SET" ) {
                  deviceId = device.mainComponent.parent.name + '_' + device.id;
                } else {
                  deviceId = device.mainComponent.name + '_' + device.id;
                }
    
                
    
    
                // Имя устройства, которое выводится в конфигураторе виджета берется из значений Title варианта фигмы, если их нет, то из значений Title
                // варианта мастер-компонента.
    
                let deviceName = '';
    
                if (device.name) {
                  deviceName = device.name;
                } else {
                  if ( device.mainComponent.parent.type === "COMPONENT_SET" ) {
                    deviceName = device.masterComponent.parent.name;
                  } else {
                    deviceName = device.masterComponent.name;
                  }
                }

                let deviceInstanceName = '';

                if ( device.mainComponent.parent.type === "COMPONENT_SET" ) {
                  deviceInstanceName = device.masterComponent.parent.name;
                } else {
                  deviceInstanceName = device.masterComponent.name;
                }


                
                config[zoneId].items[deviceId] = {
                  'title': deviceName,
                  'items': {}
                };
      
                if ( deviceInstanceName === 'multisensor' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.value';
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'multisensorTemplate',
                    'top': (device.y / frameHeight) * 100,
                    'left': (device.x / frameWidth) * 100,
                    'placement': 'auto'
                  }
                  config[zoneId].items[deviceId].items = {
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
      
                if ( deviceInstanceName === 'reedswitch' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'reedSwitchTemplate',
                    'top': (device.y / frameHeight) * 100,
                    'left': (device.x / frameWidth) * 100,
                    'placement': 'auto'
                  }
                  config[zoneId].items[deviceId].items = {
                    'reed_switch': {
                      'title': 'Reed switch'
                    }
                  }
                }
      
                if ( deviceInstanceName === 'door' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'doorStateTemplate',
                    'top': (device.y / frameHeight) * 100,
                    'left': (device.x / frameWidth) * 100,
                    'placement': 'auto'
                  }
                  config[zoneId].items[deviceId].items = {
                    'door_reed_switch': {
                      'title': 'Door state'
                    }
                  }
                }
      
                if ( deviceInstanceName === 'mnemoscheme/switch' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'mnemoschemeSwitchTemplate',
                    'top': (device.y / frameHeight) * 100,
                    'left': (device.x / frameWidth) * 100,
                    'width': device.width,
                    'rotation_angle': device.rotation,
                    'placement': 'auto'
                  }
                  config[zoneId].items[deviceId].items = {
                    'mnemoscheme_switch': {
                      'title': 'Mnemoscheme switch state'
                    }
                  }
                }
      
                if ( deviceInstanceName === 'camera' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.value';
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'cameraTemplate',
                    'top': (device.y / frameHeight) * 100,
                    'left': (device.x / frameWidth) * 100,
                    'placement': 'auto',
                    "direction": -(device.rotation)
                  }
                  config[zoneId].items[deviceId].items = {
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
      
                if ( deviceInstanceName === 'lightline' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'lightLineTemplate',
                    'top': (device.y / frameHeight) * 100,
                    'left': (device.x / frameWidth) * 100,
                    'length': device.height * 100 / frameHeight,
                    'rotation_angle': -device.rotation,
                    'placement': 'auto'
                  }

                  const illuminationRect = device.findChild(n => n.name === 'illumination');

                  if ( illuminationRect ) {
                    config[zoneId].items[deviceId]['custom_data']['bs_type'] = illuminationRect.effects[0].type === 'INNER_SHADOW' ? 'inset' : '';
                    config[zoneId].items[deviceId]['custom_data']['bs_offset_x_on'] = illuminationRect.effects[0].offset.x;
                    config[zoneId].items[deviceId]['custom_data']['bs_offset_y_on'] = illuminationRect.effects[0].offset.y;
                    config[zoneId].items[deviceId]['custom_data']['bs_blur_radius_on'] = illuminationRect.effects[0].radius;
                    config[zoneId].items[deviceId]['custom_data']['bs_spread_radius_on'] = illuminationRect.effects[0].spread;
                    config[zoneId].items[deviceId]['custom_data']['bs_color_on'] = figmaRGBToWebRGB(illuminationRect.effects[0].color);
                    config[zoneId].items[deviceId]['custom_data']['fill_on'] = figmaRGBToWebRGB(illuminationRect.fills[0].color);
                    config[zoneId].items[deviceId]['custom_data']['opacity_on'] = illuminationRect.fills[0].opacity;
                  }


                  config[zoneId].items[deviceId].items = {
                    'light_line': {
                      'title': 'Light line'
                    }
                  }
                }
      
                if ( deviceInstanceName === 'fancoil' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'fancoilTemplate',
                    'top': (device.y / frameHeight) * 100,
                    'left': (device.x / frameWidth) * 100,
                    'placement': 'auto',
                    'remote_control': device.variantProperties ? device.variantProperties['Remote control'] : '',
                    'cooling': device.variantProperties ? device.variantProperties['Cooling'] : '',
                    'heating': device.variantProperties ? device.variantProperties['Heating'] : ''
                  }
    
                  config[zoneId].items[deviceId].items = {
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
      
                if ( deviceInstanceName === 'ventilation' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                  let ventilation_description;
                  if (isJsonString(device.mainComponent.description)) {
                    ventilation_description = JSON.parse(device.mainComponent.description)
                  }
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'ventilationTemplate',
                    'top': (device.y / frameHeight) * 100,
                    'left': (device.x / frameWidth) * 100,
                    'placement': 'auto',
                    'description': ventilation_description
                  }
                  config[zoneId].items[deviceId].items = {
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
      
                if ( deviceInstanceName === 'universal' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'universalTemplate',
                    'device_type_id': device.mainComponent?.id,
                    'device_type_en': device.variantProperties['Device type (en)'],
                    'device_type_ru': device.variantProperties['Device type (ru)'],
                    'top': (device.y / frameHeight) * 100,
                    'left': (device.x / frameWidth) * 100,
                    'placement': 'auto',
                    'icon_path': device.children[0].mainComponent?.children[0]?.fillGeometry,
                    'icon_path_x': device.children[0].mainComponent?.children[0]?.x,
                    'icon_path_y': device.children[0].mainComponent?.children[0]?.y,
                  };
                  if (isJsonString(device.mainComponent.description)) {
                    config[zoneId].items[deviceId]['custom_data']['device_type_description_en'] = JSON.parse(device.mainComponent.description).en,
                    config[zoneId].items[deviceId]['custom_data']['device_type_description_ru'] = JSON.parse(device.mainComponent.description).ru
                  } else {
                    config[zoneId].items[deviceId]['custom_data']['device_type_description_en'] = '',
                    config[zoneId].items[deviceId]['custom_data']['device_type_description_ru'] = ''
                  }
                  config[zoneId].items[deviceId].items = {
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
        }

        resolve(config);

      } else {
        reject(Error('Selection is not a frame. Please select one frame.'));
        figma.notify('Selection is not a frame. Please select one frame.');
        figma.closePlugin();
      }
    } else {
      reject(Error('Please select only one frame to run plugin.'));
      figma.notify('Please select only one frame to run plugin.');
      figma.closePlugin();
    }
  });
};

function generateSettings(config: any) {
  if (config){
    settings = JSON.parse(JSON.stringify(config));

    for (const zone of Object.keys(settings)) {
      if (settings[zone].hasOwnProperty('items')) {
        delete settings[zone].item_type;
        delete settings[zone].title;
        settings[zone] = Object.assign(settings[zone], settings[zone].items)
        delete settings[zone].items;

        for (const device of Object.keys(settings[zone])) {
          delete settings[zone][device].param_type;
          delete settings[zone][device].item_type;
          delete settings[zone][device].items;
          delete settings[zone][device].title;
          delete settings[zone][device].custom_data?.template;
        }
      }      
    }
  }
  
  return settings
};


/**
 * @name activateUtilitiesUi
 * @description activates the utilities ui to run utility functions
 */

const activateUtilitiesUi = (visibility: boolean) => {
  // register the utilities UI (hidden by default)
  figma.showUI(__html__, { visible: false });
}

// ---------------------------------
// EXPORT TO FILE
// exports the device configration to a file
if (figma.command === 'export') {
  // activete utilities UI
  activateUtilitiesUi(false);

  generateConfig(figma.currentPage.selection)
  .then(response => generateSettings(response))
  .then(
    () => {
      figma.ui.postMessage({
        command: 'export',
        data: {
          filename: 'plan_assets.zip',
          data: {
            "configuration": JSON.stringify(config),
            "settings": JSON.stringify(settings, null, 2)
          }
        },
        
      })
    }
  )
  .catch(error => console.log(error));
  
}

// Open converter
// Open config to settings converter
if (figma.command === 'configToSettings') {
  figma.showUI(__html__, {title: 'Convert Plan Configuration to Editable Settings',width: 600, height: 400});
  figma.ui.postMessage({
    command: 'configToSettings'
  })
}

// HELP
// Open github help page
if (figma.command === 'help') {
  activateUtilitiesUi(false);
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
