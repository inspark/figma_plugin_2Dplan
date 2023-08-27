// @ts-nocheck
let config = {};
let settings = {};
let svg;
const selection: SceneNode = figma.currentPage.selection[0];

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

async function generateSVG(selection: any) {
  if (selection.length === 1) {
    if (selection[0].type === 'FRAME') {

      // Duplicate plan node to root
      const planClone = selection[0].clone();

      // Move
      planClone.x = selection[0].x + selection[0].width * 2;
      planClone.y = selection[0].y;

      // Rename
      planClone.name = '_' + selection[0].name;
      let imageNode;

      for (const groupName of Object.keys(planClone.children)) {
        if (planClone.children[groupName] && planClone.children[groupName].type === "GROUP" && planClone.children[groupName].visible === true) {
          const zone = planClone.children[groupName];

          // Подставляем id ноды из оригинального фрейма
          zone.name = 'zone_' + selection[0].children[groupName].id;
          for (const node of zone.children) {
            if ((node.type === 'VECTOR' || node.type === 'ELLIPSE' || node.type === 'LINE' || node.type === 'POLYGON' || node.type === 'RECTANGLE' || node.type === 'STAR' || node.type === 'BOOLEAN_OPERATION') && node.visible === true) {

              // Flatten node to Vector, check that path is closed
              const flattenedNode = figma.flatten([node], zone);

              if (flattenedNode && flattenedNode.vectorPaths[0].windingRule !== 'NONE') {
                flattenedNode.name = selection[0].children[groupName].id;
              } else {
                console.log('Контур зоны не замкнут, экспорт формы зоны не произведен.');
                flattenedNode.visible = false;
              }
            } else if ( node.type === 'TEXT' && node.visible === true) {
              const zoneTitle = node.name;
              config[zone.name].custom_data.title = node.characters;
              config[zone.name].title = node.characters;
              config[zone.name].custom_data.text = {};
              config[zone.name].custom_data.text.x = node.x;
              config[zone.name].custom_data.text.y = node.y;
              config[zone.name].custom_data.text.fontSize = node.fontSize;
              config[zone.name].custom_data.text.fills = node.fills;

              // node.visible = false;
              node.remove();
            } else {
              // node.visible = false;
              node.remove();
            }
          }

          // Если в зоне нет текстового слоя, сгенерить такой из названия зоны (группы)
          if ( !(config[zone.name].custom_data.hasOwnProperty('text')) ) {
            const font = {family: 'Open Sans', style: 'Regular'};

            try {
              // Load the font in the text node before setting the characters
              await fontLoadingFunction(font).then(() => {
                // generateZoneNames(zone)
                let zoneTextNode = figma.createText();
                zoneTextNode.fontName = font;
                zoneTextNode.fontSize = 11;
                zoneTextNode.characters = config[zone.name].custom_data.title;
                zoneTextNode.x = Number(zone.x) + (Number(zone.width) / 2) - (Number(zoneTextNode.width) / 2);
                zoneTextNode.y = Number(zone.y) + (Number(zone.height) / 2) + (Number(zoneTextNode.height) / 2);
                zoneTextNode.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];

                return zoneTextNode

              }).then(zoneTextNode => {
                config[zone.name].custom_data.text = {};
                config[zone.name].custom_data.text.x = zoneTextNode.x;
                config[zone.name].custom_data.text.y = zoneTextNode.y;
                config[zone.name].custom_data.text.fontSize = zoneTextNode.fontSize;
                config[zone.name].custom_data.text.fills = zoneTextNode.fills;
              });

            } catch(err) {
              console.error(`Error: ${err}`);
            }
          }
        } else {
          imageNode = planClone.children[groupName];
        }
      }

      if ( imageNode ) {
        imageNode.remove();
      }

      return planClone

    } else {
      figma.notify('Selection is not a frame. Please select one frame.');
      figma.closePlugin();
    }
  } else {
    figma.notify('Please select only one frame to run plugin.');
    figma.closePlugin();
  }
}

async function exportSVG(node, format) {
  // Export the vector to SVG
  svg = await node.exportAsync({ format: format, svgIdAttribute: true });
  node.remove();
  return svg
}

function zonePathExport(svg) {
  return new Promise(function(resolve, reject) {
    figma.ui.postMessage(svg);
    // let pathData;
    figma.ui.on('message', message => {
      if (message.command === 'setZonePaths') {
        for ( const zone of Object.keys(message.data) ) {
          config[zone].custom_data.path = message.data[zone];
        }
        resolve(message.data)
      }
    })
  })
}

const fontLoadingFunction = async (font) => {
  await figma.loadFontAsync(font)
}

function generateZoneNames(zone){
  // ADD ZONE NAME
  const zoneName = figma.createText();

  // Load the font in the text node before setting the characters
  // await new Promise((resolve, reject) => figma.loadFontAsync({ family: "Inter", style: "Regular" }));
  // zoneName.characters = zone.name;

  // Move to (50, 50)
  zoneName.x = zone.x + zone.width / 2 - zoneName.width / 2;
  zoneName.y = zone.y + zone.height / 2 - zoneName.height / 2;

  zoneName.fontName = {
    family: 'Inter',
    style: 'Bold'
  };
  zoneName.fontSize = 14;
  zoneName.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
  config[zone.name].custom_data.text = {};
  config[zone.name].custom_data.text.x = zoneName.x;
  config[zone.name].custom_data.text.y = zoneName.y;
  config[zone.name].custom_data.text.fontSize = zoneName.fontSize;
  config[zone.name].custom_data.text.fills = zoneName.fills;
  return zoneName
}

function generateConfig(selection: any) {
  return new Promise(function(resolve, reject) {
    if (selection.length === 1) {
      if (selection[0].type === 'FRAME') {
        let frameWidth = selection[0].width;
        let frameHeight = selection[0].height;

        for (const groupName of Object.keys(selection[0].children)) {
          if ( selection[0].children[groupName].type === "GROUP" && selection[0].children[groupName].visible === true ) {

            const zone = selection[0].children[groupName];
            const zoneId = 'zone' + '_' + zone.id;
            const zoneName = zone.name;

            config[zoneId] = {
              'title': zoneName,
              'item_type': "ITEM_TYPE.single",
              'items': {}
            };

            config[zoneId]['custom_data'] = {
              'title': zoneName,
              'id': zone.id,
            }

            let deviceCount = 0;

            for (const node of zone.children) {

              if (node.type === "INSTANCE" && node.visible === true) {
                deviceCount++;


                // В качестве названий объекта используется id элемета из Figma + название компонента.
                // Для обеспечения совместимости с файлом figma предыдущей версии добавлена проверка parent

                let deviceId = '';

                if ( node.mainComponent.parent.type === "COMPONENT_SET" ) {
                  deviceId = node.mainComponent.parent.name + '_' + node.id;
                } else {
                  deviceId = node.mainComponent.name + '_' + node.id;
                }




                // Имя устройства, которое выводится в конфигураторе виджета берется из значений Title варианта фигмы, если их нет, то из значений Title
                // варианта мастер-компонента.

                let deviceName = '';

                if (node.name) {
                  deviceName = node.name;
                } else {
                  if ( node.mainComponent.parent.type === "COMPONENT_SET" ) {
                    deviceName = node.masterComponent.parent.name;
                  } else {
                    deviceName = node.masterComponent.name;
                  }
                }

                let deviceInstanceName = '';

                if ( node.mainComponent.parent.type === "COMPONENT_SET" ) {
                  deviceInstanceName = node.masterComponent.parent.name;
                } else {
                  deviceInstanceName = node.masterComponent.name;
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
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
                    'placement': 'auto',
                    'has_temperature_filter': node.variantProperties ? node.variantProperties['Temperature'] : '',
                    'has_humidity_filter': node.variantProperties ? node.variantProperties['Humidity'] : '',
                    'has_co2_filter': node.variantProperties ? node.variantProperties['CO2'] : '',
                    'has_noise_filter': node.variantProperties ? node.variantProperties['Noise'] : '',
                    'has_lighting_filter': node.variantProperties ? node.variantProperties['Lightness'] : '',
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
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
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
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
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
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
                    'width': node.width,
                    'rotation_angle': node.rotation,
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
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
                    'placement': 'auto',
                    "direction": -(node.rotation)
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
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
                    'length': node.height * 100 / frameHeight,
                    'rotation_angle': -node.rotation,
                    'placement': 'auto'
                  }

                  const illuminationRect = node.findChild(n => n.name === 'illumination');

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
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
                    'placement': 'auto',
                    'remote_control': node.variantProperties ? node.variantProperties['Remote control'] : '',
                    'cooling': node.variantProperties ? node.variantProperties['Cooling'] : '',
                    'heating': node.variantProperties ? node.variantProperties['Heating'] : ''
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

                if ( deviceInstanceName === 'conditioner' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'conditionerTemplate',
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
                    'placement': 'auto',
                    'cooling': node.findChild(n => n.name === 'Cooling') ? node.findChild(n => n.name === 'Cooling').visible : '',
                    'heating': node.findChild(n => n.name === 'Heating') ? node.findChild(n => n.name === 'Heating').visible : '',
                    'drying': node.findChild(n => n.name === 'Drying') ? node.findChild(n => n.name === 'Drying').visible : '',
                    'auto': node.findChild(n => n.name === 'Auto') ? node.findChild(n => n.name === 'Auto').visible : '',
                  }

                  config[zoneId].items[deviceId].items = {
                    'state': {
                      'title': 'State (on|off)',
                      'item_type': 'ITEM_TYPE.single',
                      'param_type': 'PARAM_TYPE.value'
                    },
                    'operating_mode': {
                      'title': 'Operating mode',
                      'item_type': 'ITEM_TYPE.single',
                      'param_type': 'PARAM_TYPE.value'
                    },
                    'speed': {
                      'title': 'Blowing speed',
                      'item_type': 'ITEM_TYPE.single',
                      'param_type': 'PARAM_TYPE.value'
                    },
                    'temperature_setpoint': {
                      'title': 'Room temperature setpoint',
                      'item_type': 'ITEM_TYPE.single',
                      'param_type': 'PARAM_TYPE.value'
                    },
                    'alarm': {
                      'title': 'Alarm',
                      'item_type': 'ITEM_TYPE.single',
                      'param_type': 'PARAM_TYPE.value'
                    }
                  }
                }

                if ( deviceInstanceName === 'ventilation' ) {
                  config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                  config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                  let ventilation_description;
                  if (isJsonString(node.mainComponent.description)) {
                    ventilation_description = JSON.parse(node.mainComponent.description)
                  }
                  config[zoneId].items[deviceId]['custom_data'] = {
                    'title': deviceName,
                    'template': 'ventilationTemplate',
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
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
                    'device_type_id': node.mainComponent?.id,
                    'device_type_en': node.variantProperties['Device type (en)'],
                    'device_type_ru': node.variantProperties['Device type (ru)'],
                    'top': (node.y / frameHeight) * 100,
                    'left': (node.x / frameWidth) * 100,
                    'placement': 'auto',
                    'icon_path': node.children[0].mainComponent?.children[0]?.fillGeometry,
                    'icon_path_x': node.children[0].mainComponent?.children[0]?.x,
                    'icon_path_y': node.children[0].mainComponent?.children[0]?.y,
                  };
                  if (isJsonString(node.mainComponent.description)) {
                    config[zoneId].items[deviceId]['custom_data']['device_type_description_en'] = JSON.parse(node.mainComponent.description).en;
                    config[zoneId].items[deviceId]['custom_data']['device_type_description_ru'] = JSON.parse(node.mainComponent.description).ru;
                  } else {
                    config[zoneId].items[deviceId]['custom_data']['device_type_description_en'] = '';
                    config[zoneId].items[deviceId]['custom_data']['device_type_description_ru'] = '';
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
}

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
}


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
    .then(() => generateSVG(figma.currentPage.selection))
    .then(response => exportSVG(response, 'SVG_STRING'))
    .then(response => zonePathExport(response))
    .then(() => generateSettings(config))
    .then(
      () => {
        figma.ui.postMessage({
          command: 'export',
          data: {
            filename: 'plan_assets.zip',
            data: {
              "configuration": JSON.stringify(config),
              "settings": JSON.stringify(settings, null, 2),
              "svg": svg
            }
          },

        });

      }
    )
    .catch(error => console.log(error));

}

// Open converter
// Open config to settings converter
if (figma.command === 'configToSettings') {
  figma.showUI(__html__, {width: 600, height: 400});
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
    figma.closePlugin()
  }
}
