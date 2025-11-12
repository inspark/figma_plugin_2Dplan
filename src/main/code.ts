// @ts-nocheck

let config = {};
let settings = {};
let svg;

interface IDevice {
  id: string,
  component: string,
  zone: string
}

let exportedDevices: IDevice[] = [];
let exportedZones = [];
let exportedData = {};

const selection: SceneNode = figma.currentPage.selection[0];

const lockerCellsQuantityDefault = 16;

let controlFunctionMapping = [];

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

// Создаём копию плана-фрейма для подготовки к экспорту векторных элементов (скрываем то, что не нужно выгружать в svg)
async function preparePlanClone(selection: any) {
  if (selection.length === 1) {
    if (selection[0].type === 'FRAME') {

      // selection[0].setPluginData('componentName', 'rectangle');
      // Duplicate plan node to root
      const planClone = selection[0].clone();

      // Move
      planClone.x = selection[0].x + selection[0].width * 2;
      planClone.y = selection[0].y;

      // Rename
      planClone.name = '_' + selection[0].name;
      let imageNode;

      for (const groupIndex of Object.keys(planClone.children)) {
        const zone = planClone.children[groupIndex];
        if (zone && zone.type === "GROUP" &&
          zone.visible === true) {

          // Подставляем id ноды из оригинального фрейма
          zone.name = 'zone_' + selection[0].children[groupIndex].id;

          for (const nodeIndex of Object.keys(zone.children)) {
            const node = zone.children[nodeIndex];

            // Ищем контур зоны с isZonePath === true в pluginData
            const zonePathTypes = ['VECTOR', 'ELLIPSE', 'LINE', 'POLIGON', 'RECTANGLE', 'STAR', 'BOOLEAN_OPERATION'];
            const luminairesGroupTypes = ['FRAME'];
            if ((zonePathTypes.indexOf(node.type) !== -1) &&
                node.getPluginData('isZonePath') === 'true' && node.visible === true) {

              // Flatten node to Vector, check that path is closed
              const flattenedNode = figma.flatten([node], zone);

              if (flattenedNode && flattenedNode.vectorPaths[0].windingRule !== 'NONE') {
                flattenedNode.name = selection[0].children[groupIndex].id;
                config[zone.name].custom_data.fill = flattenedNode.fills[0];
                config[zone.name].custom_data.stroke = flattenedNode.strokes[0];
                config[zone.name].custom_data.strokeWidth = flattenedNode.strokeWeight;
              } else {
                console.log('Контур зоны не замкнут, экспорт формы зоны не произведен.');
                flattenedNode.visible = false;
              }
            }

            // Ищем группы светильников с deviceType === luminairesGroup в pluginData
            else if (luminairesGroupTypes.indexOf(node.type) !== -1 &&
              node.getPluginData('deviceType') === 'luminairesGroup' &&
              node.visible === true) {

              // Нужно для каждого вектора внутри сохранить его параметры
              for (const luminaire of node.children) {
                luminaire.name = luminaire.getPluginData('id');
                // check if plugin data has prop
                // Flatten node to Vector
                if ( luminaire.visible === true ) {
                  const flattenedNode = figma.flatten([luminaire], node);
                  // flattenedNode.name = selection[0].children[groupIndex].children[node].children[luminaire].id;
                  // config[zone.name].custom_data.fill = flattenedNode.fills[0];
                  // config[zone.name].custom_data.stroke = flattenedNode.strokes[0];
                  // config[zone.name].custom_data.strokeWidth = flattenedNode.strokeWeight;

                }

              }
              node.visible = true;

              //   // Flatten node to Vector, check that path is closed
              //   const flattenedNode = figma.flatten([node], zone);
              //
              // if (flattenedNode && flattenedNode.vectorPaths[0].windingRule !== 'NONE') {
              //   flattenedNode.name = selection[0].children[groupIndex].id;
              //   config[zone.name].custom_data.fill = flattenedNode.fills[0];
              //   config[zone.name].custom_data.stroke = flattenedNode.strokes[0];
              //   config[zone.name].custom_data.strokeWidth = flattenedNode.strokeWeight;
              // } else {
              //   console.log('Контур зоны не замкнут, экспорт формы зоны не произведен.');
              //   flattenedNode.visible = false;
              // }
            } else if (node.type === 'TEXT' && node.visible === true) {
              // const zoneTitle = node.name;
              config[zone.name].custom_data.title = node.characters;
              config[zone.name].title = node.characters;
              config[zone.name].custom_data.text = {};
              config[zone.name].custom_data.text.x = node.x;
              config[zone.name].custom_data.text.y = node.y;
              config[zone.name].custom_data.text.fontSize = node.fontSize;
              config[zone.name].custom_data.text.fill = node.fills[0];
              config[zone.name].custom_data.text.stroke = node.strokes[0];
              config[zone.name].custom_data.text.strokeWidth = node.strokeWeight;

              node.visible = false;
            } else if (node.type === 'INSTANCE'/* && ( node.mainComponent.name === 'text' || node.mainComponent.name === 'rectangle' )*/ && node.visible === true) {

              console.log('INSTANCE');
              node.visible = false;

              // const mainComponent = await node.getMainComponentAsync();
              // const mainComponentName = mainComponent?.name;

              node.name = node.getPluginData('id');
              // rectEl.name = selection[0].children[groupIndex].id;
              // node.name = node.mainComponent?.name + '_' + selection[0].children[groupIndex];

            } else if (node.type === 'FRAME' && node.type !== 'INSTANCE' && node.parent.type !== "GROUP" && node.visible === true) {
              node.name = node.getPluginData('id');
              // Выгрузка групп светильников
            } else {
              // node.opacity = 0;
              node.visible = false;
            }
          }

          // Если в зоне нет текстового слоя, сгенерить такой из названия зоны (группы)
          if (!(config[zone.name].custom_data.hasOwnProperty('text')) && (config[zone.name].custom_data.hasOwnProperty('path'))) {
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
                zoneTextNode.fills = [{type: 'SOLID', color: {r: 1, g: 0, b: 0}}];

                return zoneTextNode

              }).then(zoneTextNode => {
                config[zone.name].custom_data.text = {};
                config[zone.name].custom_data.text.x = zoneTextNode.x;
                config[zone.name].custom_data.text.y = zoneTextNode.y;
                config[zone.name].custom_data.text.fontSize = zoneTextNode.fontSize;
                config[zone.name].custom_data.text.fill = zoneTextNode.fills[0];
                config[zone.name].custom_data.text.stroke = zoneTextNode.strokes[0];
                config[zone.name].custom_data.text.strokeWidth = zoneTextNode.strokeWeight;
              });

            } catch (err) {
              console.error(`Error: ${err}`);
            }
          }
        } else {
          imageNode = zone;
        }
        console.log('end planClone: ', planClone);
      }

      if (imageNode) {
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

async function generateSVG(node, format) {
  // Export the vector to SVG
  svg = await node.exportAsync({format: format, svgIdAttribute: true, svgOutlineText: false})
    .catch((error) => {
      console.error(error);
      return ''
    });
  node.remove();
  console.log('generateSVG: ', svg);
  return svg ? svg : ''
}

function addSVGData(svg) {
  return new Promise(function (resolve, reject) {
    figma.ui.postMessage({svg, exportedData});
    // let pathData;
    figma.ui.on('message', message => {
      if (message.command === 'setSVGData') {
        for (const zone of Object.keys(message.data)) {
          config[zone].custom_data.path = message.data[zone].path;

          // Обновить конфиг данными по элементам из svg
          if (message.data[zone].devices) {
            for (const device of Object.keys(message.data[zone].devices)) {
              const deviceId = message.data[zone].devices[device].id;
              if (config[zone].items[deviceId]) {
                const configUpdated = Object.assign(config[zone].items[deviceId].custom_data, message.data[zone].devices[device]);
              }
            }
          }
        }
        resolve(message.data)
      }
    })
  })
}

const fontLoadingFunction = async (font) => {
  await figma.loadFontAsync(font)
}

function generateZoneNames(zone) {
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
  zoneName.fills = [{type: 'SOLID', color: {r: 1, g: 0, b: 0}}];
  config[zone.name].custom_data.text = {};
  config[zone.name].custom_data.text.x = zoneName.x;
  config[zone.name].custom_data.text.y = zoneName.y;
  config[zone.name].custom_data.text.fontSize = zoneName.fontSize;
  config[zone.name].custom_data.text.fills = zoneName.fills;
  return zoneName
}

class Zone {

}

class Device {
  constructor() {
  }
}

class Graphic {

}

class Parameter {

}
// Создаём базовый конфиг по всем зонам и устройствам из выделенного плана-фрейма
function generateConfig(selection: any) {
  return new Promise(async function (resolve, reject) {
    if (selection.length === 1) {
      if (selection[0].type === 'FRAME') {
        let frameWidth = selection[0].width;
        let frameHeight = selection[0].height;

        for (const groupIndex of Object.keys(selection[0].children)) {
          if (selection[0].children[groupIndex].type === "GROUP" && selection[0].children[groupIndex].visible === true) {

            const zone = selection[0].children[groupIndex];
            zone.setPluginData('id', zone.id);
            const zoneId = 'zone' + '_' + zone.id;
            const zoneName = zone.name;

            exportedData[zoneId] = {};

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

            for (const nodeIndex of Object.keys(zone.children)) {
              const node = zone.children[nodeIndex];

              if (node.type === 'FRAME' && node.visible === true && node.getPluginData('deviceType') === 'luminairesGroup') {
                deviceCount++;

                let deviceId = 'luminairesGroup_' + node.id;
                let deviceName = node.name;

                node.setPluginData('isExportable', 'true');
                config[zoneId].items[deviceId] = {
                  'title': deviceName,
                  'items': {}
                };


                config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                config[zoneId].items[deviceId]['custom_data'] = {
                  'title': deviceName,
                  'template': 'luminairesGroupTemplate',
                  'top': (node.y / frameHeight) * 100,
                  'left': (node.x / frameWidth) * 100,
                  'placement': 'auto',
                  'luminaires': [],
                  'items': {}
                }

                config[zoneId].items[deviceId].items = {
                  'state': {
                    'title': 'State (on|off)'
                  },
                  'dimming': {
                    'title': 'Dimming'
                  },
                  'state_status': {
                    'title': 'State status'
                  },
                  'dimming_status': {
                    'title': 'Dimming status'
                  }
                };

                // const illuminationRect = node.findChild(n => n.name === 'illumination');

                // if (illuminationRect) {
                //   config[zoneId].items[deviceId]['custom_data']['bs_type'] = illuminationRect.effects[0].type === 'INNER_SHADOW' ? 'inset' : '';
                //   config[zoneId].items[deviceId]['custom_data']['bs_offset_x_on'] = illuminationRect.effects[0].offset.x;
                //   config[zoneId].items[deviceId]['custom_data']['bs_offset_y_on'] = illuminationRect.effects[0].offset.y;
                //   config[zoneId].items[deviceId]['custom_data']['bs_blur_radius_on'] = illuminationRect.effects[0].radius;
                //   config[zoneId].items[deviceId]['custom_data']['bs_spread_radius_on'] = illuminationRect.effects[0].spread;
                //   config[zoneId].items[deviceId]['custom_data']['bs_color_on'] = figmaRGBToWebRGB(illuminationRect.effects[0].color);
                //   config[zoneId].items[deviceId]['custom_data']['fill_on'] = figmaRGBToWebRGB(illuminationRect.fills[0].color);
                //   config[zoneId].items[deviceId]['custom_data']['opacity_on'] = illuminationRect.fills[0].opacity;
                // }
                // console.log('node.children: ', node.children);

                // Получаем список светильников группы
                let childrenNodesArrFiltered = Array.from(node.children, (child) => {
                  child.setPluginData('id', child.id);
                  return {id: child.id, name: child.name}
                });
                // const childrenNodesObj = childrenNodesArrFiltered.reduce(
                //   (obj, item) => Object.assign(obj, {item.id: { name: item.name }}), {});
                // console.log('childrenNodesObj: ', childrenNodesObj);


                const childrenNodesObj = childrenNodesArrFiltered.reduce((a, v) => ({ ...a, [v.id]: {
                  'title': 'Error ' + v.name,
                  'item_type': 'ITEM_TYPE.single',
                  'param_type': 'PARAM_TYPE.value'
                }}), {});
                // const childrenNodesObjProps = childrenNodesArrFiltered.reduce((a, v) => {
                //   a.push({ 'id': v.id, 'name': v.name });
                //   return a;
                // }, []);
                // const childrenNodesObjProps = childrenNodesArrFiltered.reduce((a, v) => ({ ...a, [v.id]: {
                //   'id': v.id,
                //   'name': v.name
                // }}), {});
                // Object.assign(config[zoneId].items[deviceId].custom_data.items, childrenNodesObj);

                Object.assign(config[zoneId].items[deviceId].items, childrenNodesObj);
                // config[zoneId].items[deviceId] = {
                //   'title': deviceName,
                //   'items': {}
                // };
                // Получаем deviceType из pluginData

                // node.setPluginData('id', node.id);
              }

              if (node.type === "INSTANCE" && node.visible === true) {
                deviceCount++;
                console.log('generateConfig INSTANCE node: ', node);
                console.log('generateConfig node.name: ', node.name);

                const mainComponent = await node.getMainComponentAsync();
                if (mainComponent) {
                  console.log('main component', mainComponent);

                  // В качестве названий объекта используется id элемета из Figma + название компонента.
                  // Для обеспечения совместимости с файлом figma предыдущей версии добавлена проверка parent

                  let deviceId = '';

                  if (mainComponent.parent.type === "COMPONENT_SET") {
                    deviceId = mainComponent.parent.name + '_' + node.id;
                  } else {
                    deviceId = mainComponent.name + '_' + node.id;
                  }


                  // Имя устройства, которое выводится в конфигураторе виджета берется из значений Title варианта фигмы, если их нет, то из значений Title
                  // варианта мастер-компонента.

                  let deviceName = '';

                  if (node.name) {
                    deviceName = node.name;
                  } else {
                    if (mainComponent.parent.type === "COMPONENT_SET") {
                      deviceName = node.masterComponent.parent.name;
                    } else {
                      deviceName = node.masterComponent.name;
                    }
                  }

                  let deviceComponentName = '';

                  if (mainComponent.parent.type === "COMPONENT_SET") {
                    deviceComponentName = mainComponent.parent.name;
                  } else {
                    deviceComponentName = mainComponent.name;
                  }

                  node.setPluginData('deviceType', deviceComponentName);

                  config[zoneId].items[deviceId] = {
                    'title': deviceName,
                    'items': {}
                  };

                  node.setPluginData('id', node.id);

                  switch (deviceComponentName) {
                    case 'multisensor':
                      node.setPluginData('isExportable', 'false');
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
                      };
                      break;

                    case 'reedswitch':
                      node.setPluginData('isExportable', 'false');
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
                      break;

                    case 'door':
                      node.setPluginData('isExportable', 'false');
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
                      break;

                    case 'mnemoscheme/switch':
                      node.setPluginData('isExportable', 'false');
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
                      break;

                    case 'rectangle':
                      node.setPluginData('isExportable', 'true');
                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                      config[zoneId].items[deviceId]['custom_data'] = {
                        'title': node.name,
                        'template': 'rectangleTemplate',
                        'rotation_angle': node.rotation,
                        'placement': 'auto'
                      }

                      const rectEl = node.findOne(node => {
                        return node.type === "RECTANGLE"
                      });

                      if (rectEl) {
                        // node.setPluginData('componentName', 'rectangle');
                        // node.name = node.getPluginData('id');
                        // rectEl.name = selection[0].children[groupIndex].id;
                        config[zoneId].items[deviceId]['custom_data'].fill = rectEl.fills[0];
                        config[zoneId].items[deviceId]['custom_data'].stroke = rectEl.strokes[0];
                        config[zoneId].items[deviceId]['custom_data'].strokeWidth = rectEl.strokeWeight;
                      } else {
                        console.log('Контур фигуры не замкнут, экспорт формы зоны не произведен.');
                        // flattenedNode.visible = false;
                      }

                      config[zoneId].items[deviceId].items = {
                        'rectangle': {
                          'title': 'Fill state'
                        }
                      }
                      break;

                    case 'text':
                      node.setPluginData('isExportable', 'true');
                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                      config[zoneId].items[deviceId]['custom_data'] = {
                        'title': node.name,
                        'template': 'textTemplate',
                        'rotation_angle': node.rotation,
                        'placement': 'auto'
                      }

                      const textEl = node.findOne(node => {
                        return node.type === "TEXT"
                      });

                      if (textEl) {
                        // node.name = node.getPluginData('id');
                        // textEl.name = selection[0].children[groupIndex].id;

                        if (textEl.fills.length > 0) {
                          if (Object.keys(textEl.fills[0]?.boundVariables).length === 0 && textEl.fills[0]?.boundVariables.constructor === Object) {
                            config[zoneId].items[deviceId]['custom_data'].fill = textEl.fills[0];
                          } else {
                            const variableId = textEl.fills[0].boundVariables.color?.id;
                            const variableObj = await figma.variables.getVariableByIdAsync(variableId);
                            const variableName = variableObj ? variableObj.name : '';

                            switch (variableName) {
                              case 'currentColor':
                                config[zoneId].items[deviceId]['custom_data'].fill = 'currentColor';
                                break;

                              case 'statusColor':
                                config[zoneId].items[deviceId]['custom_data'].fill = 'statusColor';
                                break;

                              case 'onStatusColor':
                                config[zoneId].items[deviceId]['custom_data'].fill = 'onStatusColor';
                            }
                            if (variableName === 'currentColor') {

                            }
                          }
                        }

                        config[zoneId].items[deviceId]['custom_data'].stroke = textEl.strokes[0];
                        config[zoneId].items[deviceId]['custom_data'].strokeWidth = textEl.strokeWeight;
                        config[zoneId].items[deviceId]['custom_data'].characters = textEl.characters;
                      }

                      config[zoneId].items[deviceId].items = {
                        'text': {
                          'title': 'Text'
                        }
                      }
                      break;

                    case 'camera':
                      node.setPluginData('isExportable', 'false');
                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.value';
                      config[zoneId].items[deviceId]['custom_data'] = {
                        'title': deviceName,
                        'template': 'cameraTemplate',
                        'top': (node.y / frameHeight) * 100,
                        'left': (node.x / frameWidth) * 100,
                        'placement': 'auto',
                        'direction': -(node.rotation)
                      }
                      config[zoneId].items[deviceId].items = {
                        'channel': {
                          'title': 'Channel MJPEG',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'channel_hls': {
                          'title': 'Channel HLS',
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
                      };
                      break;

                    case 'lightline':
                      node.setPluginData('isExportable', 'false');
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

                      if (illuminationRect) {
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
                      };

                      break;

                    case 'fancoil':
                      node.setPluginData('isExportable', 'false');
                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                      config[zoneId].items[deviceId]['custom_data'] = {
                        'title': deviceName,
                        'template': 'fancoilTemplate',
                        'top': (node.y / frameHeight) * 100,
                        'left': (node.x / frameWidth) * 100,
                        'placement': 'auto',
                        'remote_control': node.variantProperties ? node.variantProperties['Remote control'] : node.componentProperties['Remote control'].value,
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
                      };
                      break;

                    case 'fancoil3relay':
                      node.setPluginData('isExportable', 'false');
                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                      config[zoneId].items[deviceId]['custom_data'] = {
                        'title': deviceName,
                        'template': 'fancoil3relayTemplate',
                        'top': (node.y / frameHeight) * 100,
                        'left': (node.x / frameWidth) * 100,
                        'placement': 'auto'
                      }

                      config[zoneId].items[deviceId].items = {
                        'relay_1': {
                          'title': 'Relay 1',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'relay_2': {
                          'title': 'Relay 2',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'relay_3': {
                          'title': 'Relay 3',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        }
                      }
                      break;

                    case 'conditioner':
                      node.setPluginData('isExportable', 'false');
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
                        'settings': node.getPluginData('settings') ? JSON.parse(node.getPluginData('settings')) : ''
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
                      break;

                    case 'ventilation':
                      node.setPluginData('isExportable', 'false');
                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                      let ventilation_description;
                      if (isJsonString(mainComponent.description)) {
                        ventilation_description = JSON.parse(mainComponent.description)
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
                      break;

                    case 'universal':
                      node.setPluginData('isExportable', 'false');
                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                      const childMainComponent = await node.children[0].getMainComponentAsync();
                      config[zoneId].items[deviceId]['custom_data'] = {
                        'title': deviceName,
                        'template': 'universalTemplate',
                        'device_type_id': mainComponent?.id,
                        'device_type_en': node.variantProperties['Device type (en)'],
                        'device_type_ru': node.variantProperties['Device type (ru)'],
                        'top': (node.y / frameHeight) * 100,
                        'left': (node.x / frameWidth) * 100,
                        'placement': 'auto',
                        'icon_path': childMainComponent?.children[0]?.fillGeometry,
                        'icon_path_x': childMainComponent?.children[0]?.x,
                        'icon_path_y': childMainComponent?.children[0]?.y,
                      };
                      if (isJsonString(mainComponent.description)) {
                        config[zoneId].items[deviceId]['custom_data']['device_type_description_en'] = JSON.parse(mainComponent.description).en;
                        config[zoneId].items[deviceId]['custom_data']['device_type_description_ru'] = JSON.parse(mainComponent.description).ru;
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
                      break;

                    case 'locker':
                      node.setPluginData('isExportable', 'false');

                      let cells_quantity = node.getPluginData('cells_quantity') ? node.getPluginData('cells_quantity') : 16;
                      let cells_numbers = getLockerCellNumbers(node, 'cells_numbers', lockerCellsQuantityDefault);

                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                      config[zoneId].items[deviceId]['custom_data'] = {
                        'title': deviceName,
                        'template': 'lockerTemplate',
                        'top': (node.y / frameHeight) * 100,
                        'left': (node.x / frameWidth) * 100,
                        'placement': 'auto',
                        'cells_numbers': JSON.parse(JSON.stringify(cells_numbers)),
                        'length': 16
                      };
                      config[zoneId].items[deviceId].items = {
                        'access_mode': {
                          'title': 'Режим доступа',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_1': {
                          'title': '1',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_2': {
                          'title': '2',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_3': {
                          'title': '3',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_4': {
                          'title': '4',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_5': {
                          'title': '5',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_6': {
                          'title': '6',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_7': {
                          'title': '7',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_8': {
                          'title': '8',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_9': {
                          'title': '9',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_10': {
                          'title': '10',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_11': {
                          'title': '11',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_12': {
                          'title': '12',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_13': {
                          'title': '13',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_14': {
                          'title': '14',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_15': {
                          'title': '15',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        },
                        'cell_16': {
                          'title': '16',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        }
                      }
                      break;

                    case 'rotation_module':
                      node.setPluginData('isExportable', 'false');
                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';

                      const controlFunctionMappingDefault = [
                        {
                          'id': 0,
                          'en': 'Don`t use',
                          'ru': 'Не использовать'
                        },
                        {
                          'id': 1,
                          'en': 'Always off',
                          'ru': 'Всегда выключено'
                        },
                        {
                          'id': 2,
                          'en': 'Backup only',
                          'ru': 'Только резервный'
                        },
                        {
                          'id': 3,
                          'en': 'Reserve rotation',
                          'ru': 'Ротация резервного'
                        },
                        {
                          'id': 4,
                          'en': 'Рабочий без ротации',
                          'ru': 'Working, no rotation'
                        },
                        {
                          'id': 5,
                          'en': 'Always on',
                          'ru': 'Всегда включено'
                        },
                      ];

                      config[zoneId].items[deviceId]['custom_data'] = {
                        'title': deviceName,
                        'template': 'rotationModuleTemplate',
                        'top': (node.y / frameHeight) * 100,
                        'left': (node.x / frameWidth) * 100,
                        'placement': 'auto',
                        'function_map': controlFunctionMapping.length > 0 ? controlFunctionMapping : controlFunctionMappingDefault
                      };
                      config[zoneId].items[deviceId].items = {
                        'control_function': {
                          'title': 'Функция управления',
                          'item_type': 'ITEM_TYPE.single',
                          'param_type': 'PARAM_TYPE.value'
                        }
                      }
                      break;

                    case 'object':
                      node.setPluginData('isExportable', 'false');
                      config[zoneId].items[deviceId]['item_type'] = 'ITEM_TYPE.single';
                      config[zoneId].items[deviceId]['param_type'] = 'PARAM_TYPE.signal';
                      config[zoneId].items[deviceId]['custom_data'] = {
                        'title': deviceName,
                        'template': 'objectTemplate',
                        'top': (node.y / frameHeight) * 100,
                        'left': (node.x / frameWidth) * 100,
                        'placement': 'auto',
                        'url': node.reactions[0]?.action?.type === 'URL' ? node.reactions[0]?.action?.url : ''
                      }
                      break;

                    default:
                      console.log('Unknown component');
                  }

                  if (node.getPluginData('isExportable') === 'true') {
                    setExportedData(node, deviceComponentName)
                  }
                }
              }

              if (node.getPluginData('isExportable') === 'true') {
                const deviceType = node.getPluginData('deviceType') ? node.getPluginData('deviceType') : '';
                setExportedData(node, deviceType);
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

function setExportedData(node, deviceComponentName = '') {
  exportedData['zone_' + node.parent.id][node.id] = {
    id: node.id,
    name: node.name,
    component: deviceComponentName ? deviceComponentName : '',
    zone: 'zone_' + node.parent.id
  }
}

function getLockerCellNumbers(node, key: string, quantityDefault: number) {
  const lockerCellsNumbersDefault = Array.from({length: quantityDefault}, (_, i) => i + 1); // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  let cells_numbers = [];
  let pluginDataCellsNumbers = node.getPluginData(key);
  if (pluginDataCellsNumbers && Array.isArray(JSON.parse(pluginDataCellsNumbers)) && JSON.parse(pluginDataCellsNumbers).length === quantityDefault) {
    cells_numbers = pluginDataCellsNumbers;
  } else {
    cells_numbers = lockerCellsNumbersDefault;
    node.setPluginData(key, JSON.stringify(cells_numbers));
  }

  return cells_numbers
}

function generateSettings(config: any) {
  if (config) {
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
  figma.showUI(__html__, {visible: false});
}

const serialize = async (node: SceneNode): Promise<any> => {
  if (node.type === 'INSTANCE') {
    const mainComponent = await node.getMainComponentAsync();
    return {
      name: node.name,
      id: node.id,
      type: node.type,
      parentType: node.parent.type,
      mainComponentName: mainComponent?.name,
      pluginData: node.getPluginDataKeys().reduce((a, v) => ({...a, [v]: node.getPluginData(v)}), {})
    }
  } else if (node.type === 'FRAME' && node.parent.type === 'GROUP') {
    let childrenNodes = Array.from(node.children, (child) => {
      return {id: child.id, name: child.name}
    });

    return {
      name: node.name,
      id: node.id,
      type: node.type,
      parentType: node.parent.type,
      children: childrenNodes,
      pluginData: node.getPluginDataKeys().reduce((a, v) => ({...a, [v]: node.getPluginData(v)}), {})
    }
  } else {
    return {
      name: node.name,
      id: node.id,
      type: node.type,
      parentType: node.parent.type,
      pluginData: node.getPluginDataKeys().reduce((a, v) => ({...a, [v]: node.getPluginData(v)}), {})
    }
  }
}

const getSerializedSelection = (selection: readonly SceneNode[]) => {
  return Promise.all(selection.map(serialize))
}


const sendSerializedSelection = async (selection: readonly SceneNode[]) => {
  const els = await getSerializedSelection(selection);
  figma.ui.postMessage({
    command: 'setup',
    nodes: els,
    lockerCellsQuantityDefault: lockerCellsQuantityDefault
  });
}

function start() {
  // sendInitialized()

  figma.on('selectionchange', () => {
    sendSerializedSelection(figma.currentPage.selection);
  });
}


// ---------------------------------
// SETUP PLAN NODES
// configure instances for export
if (figma.command === 'setup') {
  figma.showUI(__html__, {width: 600, height: 400});

  // const node = figma.currentPage.selection[0];

  // start();

  figma.on('selectionchange', () => {
    onSetupPrepareSelection().then(nodes => sendSerializedSelection(nodes));
  });

  onSetupPrepareSelection().then(nodes => sendSerializedSelection(nodes));

}

async function onSetupPrepareSelection() {
  const nodes = figma.currentPage.selection;
  const node: SceneNode = figma.currentPage.selection[0];
  if (node && node.type === "INSTANCE") {
    getComponentFromInstance(node).then(mainComponent => {
      if (mainComponent.name === 'locker') {
        getLockerCellNumbers(node, 'cells_numbers', lockerCellsQuantityDefault);
      }
    });
  } else if (node.type === 'FRAME' && node.visible === true) {

    // Для групп светильников
  }
  return nodes
}

async function getComponentFromInstance(instanceNode: InstanceNode) {
  const mainComponent = await instanceNode.getMainComponentAsync();
  if (mainComponent) {
    return mainComponent;
  } else {
    console.log("No main component found for this instance.");
  }
}

// ---------------------------------
// EXPORT TO FILE
// exports the device configuration to a file
if (figma.command === 'export') {
  // activete utilities UI
  console.log('export start');
  activateUtilitiesUi(false);

  generateConfig(figma.currentPage.selection)
    .then(() => {
      console.log('preparePlanClone');
      return preparePlanClone(figma.currentPage.selection)
    })
    .then(response => generateSVG(response, 'SVG_STRING'))
    .then(response => {
      // console.log('addSVGData');
      return addSVGData(response)
    })
    .then(() => {
      console.log('generateSettings');
      return generateSettings(config)
    })
    .then(
      () => {
        console.log('postMessage');
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

  if (message.command === 'setLockerData') {
    const targetNode = await figma.getNodeByIdAsync(message.nodeId);
    let cells_numbers = message.data;
    if (Array.isArray(cells_numbers)) {
      targetNode.setPluginData('cells_numbers', JSON.stringify(cells_numbers));
    }
  }

  if (message.command === 'setConditionerData') {
    const targetNode = await figma.getNodeByIdAsync(message.nodeId);
    targetNode.setPluginData('settings', JSON.stringify(message.data));
    console.log('setConditionerData targetNode: ', targetNode, targetNode.name);
  }

  if (message.command === 'setZoneData') {
    const targetNode = await figma.getNodeByIdAsync(message.nodeId);
    let isZonePath = message.data;
    targetNode.setPluginData('isZonePath', JSON.stringify(isZonePath));
  }

  if (message.command === 'setLuminairesGroupData') {
    // console.log('setLuminairesGroupData message code.ts: ', message);
    const targetNode = await figma.getNodeByIdAsync(message.nodeId);
    let deviceType = message.data;
    targetNode.setPluginData('deviceType', deviceType);
    debugger;
  }
}
