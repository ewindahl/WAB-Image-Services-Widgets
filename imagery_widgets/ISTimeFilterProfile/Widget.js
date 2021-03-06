///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2013 Esri. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define([
  'dojo/_base/declare',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./Widget.html',
  'jimu/BaseWidget',
  "dijit/registry",
  "dojo/_base/lang",
  "dojo/html",
  "dojo/dom",
  "esri/layers/MosaicRule",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/geometry/Extent",
  "dojo/date/locale",
  "dojox/charting/Chart",
  "dojox/charting/action2d/Tooltip",
  "dojox/charting/themes/PrimaryColors",
  "dojox/charting/widget/SelectableLegend",
  "dojox/charting/action2d/Magnify",
  "dojo/html",
  "dojo/dom-construct",
  "dijit/form/HorizontalSlider",
  "dijit/form/HorizontalRule",
  "dijit/form/HorizontalRuleLabels",
  "esri/graphic",
  "esri/symbols/SimpleLineSymbol",
  "dojo/dom-style",
  "esri/tasks/ImageServiceIdentifyTask",
  "esri/tasks/ImageServiceIdentifyParameters",
  "esri/geometry/Polygon",
  "esri/geometry/Point",
  "dojo/i18n!esri/nls/jsapi",
  "esri/request","esri/toolbars/draw",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/Color",
  "dojo/i18n!./nls/strings",
  "dijit/form/Select",
  "dijit/form/Button",
  "dijit/form/NumberSpinner",
  "dijit/form/CheckBox",
  "dijit/form/TextBox",
  "dijit/form/DropDownButton",
  "dijit/TooltipDialog",
  "dijit/Tooltip",
  "dijit/Dialog",
  "dojox/charting/plot2d/Lines",
  "dojox/charting/plot2d/Markers",
  "dojox/charting/axis2d/Default",
  "esri/graphic"
],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                registry,
                lang,
                html,
                dom,
                MosaicRule,
                Query, QueryTask, Extent, locale,  Chart, Tooltip, theme, SelectableLegend, Magnify, html, domConstruct, HorizontalSlider, HorizontalRule, HorizontalRuleLabels,  Graphic, SimpleLineSymbol, domStyle, ImageServiceIdentifyTask, ImageServiceIdentifyParameters, Polygon, Point, bundle, esriRequest,Draw, SimpleMarkerSymbol, Color,  strings) {
          var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
            templateString: template,
            name: 'ISTimeFilterProfile',
            baseClass: 'jimu-widget-ISTimeFilterProfile',
            primaryLayer: null,
            secLayer: null,
            orderedDates: null,
            sliderRules: null,
            sliderLabels: null,
            slider: null,
            features: null,
            sliderValue: null,
            featureIds: [],
            bandNames: [],
            responseAlert: true,
            clicktemporalProfile: null,
            datesClicked: null,
            ischartShow: false,
            graphId: [],
            handlerer: null,
            startup: function () {
              this.inherited(arguments);
              domConstruct.place('<img id="loadingTimeProfile" style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">', this.domNode);
              this.hideLoading();
              this.layerInfos = this.config;
            },
            postCreate: function () {
              registry.byId("refreshTimesliderButton").on("click", lang.hitch(this, this.timeSliderRefresh));
              registry.byId("timeLineFilter").on("change", lang.hitch(this, this.setFilterDiv));
              if (this.map) {
                this.map.on("update-end", lang.hitch(this, this.refreshData));
                this.map.on("update-start", lang.hitch(this, this.showLoading));
                this.map.on("update-end", lang.hitch(this, this.hideLoading));
              }
            },
            addGraphic: function(geometry){
                    
                    this.clear();
                    for(var a in this.map.graphics.graphics){
                        if(this.map.graphics.graphics[a].geometry && this.map.graphics.graphics[a].geometry.type==="point" && this.map.graphics.graphics[a].symbol && this.map.graphics.graphics[a].symbol.color.r===255){
                            this.map.graphics.remove(this.map.graphics.graphics[a]);
                            break;
                        }
                    }
                    var symbol = new esri.symbol.SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
                                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                                            new Color([255, 0, 0]), 1),
                                    new Color([255, 0, 0, 0.35]));
                    var graphic = new esri.Graphic(geometry, symbol);
                    this.map.graphics.add(graphic);
                    this.temporalProfile(geometry);
                   
                },
            onOpen: function () {
              this.toolbarTemporalProfile = new Draw(this.map);
                    dojo.connect(this.toolbarTemporalProfile,"onDrawEnd",lang.hitch(this,this.addGraphic));
                    if(registry.byId("timeLineFilter").checked)
                        this.toolbarTemporalProfile.activate(Draw.POINT);
                    bundle.toolbars.draw.addPoint = "Pick a point";
              this.refreshData();
            },
            onClose: function () {
                for(var a in this.map.graphics.graphics){
                        if(this.map.graphics.graphics[a].geometry && this.map.graphics.graphics[a].geometry.type==="point" && this.map.graphics.graphics[a].symbol && this.map.graphics.graphics[a].symbol.color.r===255){
                            this.map.graphics.remove(this.map.graphics.graphics[a]);
                            break;
                        }
                    }
              html.set(this.pointOnGraph, "");
              this.clear();
              this.ischartShow = false;
              domStyle.set("sliderRules", "display", "block");
              domStyle.set("sliderLabels", "display", "block");
              domStyle.set("slider", "display", "block");
               this.toolbarTemporalProfile.deactivate();
              
            },
            clear: function () {
            
              registry.byId("timeDialog").hide();
              if (this.chart) {
                
               dojo.empty("chartNodes");
              }
            },
            checkTime: function (currentVersion) {
              var field;
              if (currentVersion >= 10.21) {
                if (this.layerInfos[this.label]) {
                  if (this.layerInfos[this.label].acquisitionDate&&this.layerInfos[this.label].objectID&&this.layerInfos[this.label].category&&this.layerInfos[this.label].groupName) {
                    this.dateField = this.layerInfos[this.label].acquisitionDate;
                    registry.byId("timeLineFilter").set("disabled", false);
                    if (this.ischartShow === true) {
                      if (!registry.byId("timeDialog").open) {
                        registry.byId("timeDialog").show();
                      }
                      html.set(this.pointForTemporalProfile, "");
                    } else {
                      if (registry.byId("timeLineFilter").checked === true)
                      {
                        html.set(this.pointForTemporalProfile, strings.pointForTemporalProfile);
                      }
                    }
                    html.set(this.errorDivContent, "");
                  } else {
                    registry.byId("timeLineFilter").set("checked", false);
                    registry.byId("timeLineFilter").set("disabled", true);
                    html.set(this.errorDivContent, strings.error);
                    html.set(this.pointForTemporalProfile, "");
                    registry.byId("timeDialog").hide();
                  }
                } else {
                  registry.byId("timeLineFilter").set("checked", false);
                  registry.byId("timeLineFilter").set("disabled", true);
                  registry.byId("timeDialog").hide();
                  html.set(this.errorDivContent, strings.error);
                  html.set(this.pointForTemporalProfile, "");
                }
              } else {
                registry.byId("timeLineFilter").set("checked", false);
                registry.byId("timeLineFilter").set("disabled", true);
                registry.byId("timeDialog").hide();
                html.set(this.errorDivContent, strings.serviceError);
                html.set(this.pointForTemporalProfile, "");
              }
            },
            refreshData: function () {
              var layersRequest, bandMean, bandProp = [], currentVersion, timeInfo;
              if (this.map.layerIds) {
                this.prevPrimary = this.primaryLayer;
                if (this.map.getLayer("resultLayer")) {
                  if (this.primaryLayer !== this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]) && this.primaryLayer) {
                    this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                  } else {
                    this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 2]);
                  }
                } else {
                  if (this.primaryLayer !== this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]) && this.primaryLayer) {
                    this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                  } else {
                    this.primaryLayer = this.map.getLayer(this.map.layerIds[this.map.layerIds.length - 1]);
                  }
                }
                this.label = this.primaryLayer.url.split('//')[1];
                if(this.layerInfos[this.label])
                  this.toolbarTemporalProfile.activate(Draw.POINT);
                this.defaultMosaicRule = this.primaryLayer.defaultMosaicRule;
                if (!this.layerInfos[this.label]) {
                  this.showLoading();
                  this.layerObj = {
                      objectID: "OBJECTID",
                      category: "Category",
                      groupName: "GroupName"
                  };
                  if (this.primaryLayer.type === "ArcGISImageServiceLayer") {
                    if(this.primaryLayer.bandCount){
                      this.layerObj.bandCount = this.primaryLayer.bandCount;
                      this.layerObj.bandNames = [];
                      for(var i=0;i<this.layerObj.bandCount;i++){
                        var num = i+1;
                        this.layerObj.bandNames[i] = num.toString(); 
                      }
                    }
                    for(var j in this.primaryLayer.fields){
                      if(this.primaryLayer.fields[j].name==="AcquisitionDate")
                        this.layerObj.acquisitionDate = this.primaryLayer.fields[j].name;
                    }
                    layersRequest = esriRequest({
                      url: this.primaryLayer.url + "/1/info/keyProperties",
                      content: {f: "json"},
                      handleAs: "json",
                      callbackParamName: "callback"
                    });
                    bandMean = [];
                    layersRequest.then(lang.hitch(this, function (response) {
                      bandProp = response.BandProperties;
                      if (bandProp) {
                        for (var i = 0; i < bandProp.length; i++) {
                          if (bandProp[i] && bandProp[i].BandName) {
                            this.layerObj.bandNames[i] = bandProp[i].BandName;
                          }
                        }
                      }
                      for (i in this.layerObj.bandNames) {
                        if (this.layerObj.bandNames[i] === "NearInfrared" || this.layerObj.bandNames[i] === "NearInfrared_1" || this.layerObj.bandNames[i] === "NIR" || this.layerObj.bandNames[i] === "NIR_1") {
                          this.layerObj.nirIndex = i;
                        }
                        if (this.layerObj.bandNames[i] === "Red") {
                          this.layerObj.redIndex = i;
                        }
                        if (this.layerObj.bandNames[i] === "SWIR 1") {
                          this.layerObj.swirIndex = i;
                        }
                      }
                      this.addObj();
                    }), function () {
                      //console.log("Error: ", error.message);
                      this.addObj();
                    });
                  } else {
                    this.hideLoading();
                  }
                }
                if (!this.prevPrimary) {
                  this.mosaicBackup = this.primaryLayer.mosaicRule;
                  this.primaryLayer.on("visibility-change", lang.hitch(this, this.sliderChange));
                } else if (this.prevPrimary.url !== this.primaryLayer.url) {
                  this.mosaicBackup = this.primaryLayer.mosaicRule;
                  this.primaryLayer.on("visibility-change", lang.hitch(this, this.sliderChange));
                } else if (this.prevPrimary.url === this.primaryLayer.url && this.primaryLayer.mosaicRule) {
                  if (this.primaryLayer.mosaicRule.method !== "esriMosaicLockRaster") {
                    this.mosaicBackup = this.primaryLayer.mosaicRule;
                  }
                }
                currentVersion = this.primaryLayer.currentVersion;
                if (this.primaryLayer.currentVersion)
                {
                  currentVersion = this.primaryLayer.currentVersion;
                  this.checkTime(currentVersion);
                } else {
                  layersRequest = esriRequest({
                    url: this.primaryLayer.url,
                    content: {f: "json"},
                    handleAs: "json",
                    callbackParamName: "callback"
                  });
                  layersRequest.then(lang.hitch(this, function (data) {
                    currentVersion = data.currentVersion;
                    this.checkTime(currentVersion);
                  }), lang.hitch(this, function (error) {
                    domStyle.set("loadingTimeProfile", "display", "none");
                  }));
                }
                if (!this.slider) {
                  this.timeSliderShow();
                }
              }
              domStyle.set("loadingTimeProfile", "display", "none");
              this.secLayer = this.primaryLayer;
            },
            addObj: function(){
              if(this.layerObj.bandCount&&this.layerObj.bandNames){
                this.layerInfos[this.label]=this.layerObj;
                this.toolbarTemporalProfile.activate(Draw.POINT);
                this.hideLoading();
              }
              else {
                this.hideLoading();
                for(var a in this.map.graphics.graphics){
                  if(this.map.graphics.graphics[a].geometry && this.map.graphics.graphics[a].geometry.type==="point" && this.map.graphics.graphics[a].symbol && this.map.graphics.graphics[a].symbol.color.r===255){
                    this.map.graphics.remove(this.map.graphics.graphics[a]);
                    break;
                  }
                }
                this.toolbarTemporalProfile.deactivate();
              }
            },
            limitValue: function (num) {
              if (num < (-1)) {
                num = -1;
              }
              if (num > 1) {
                num = 1;
              }
              return num;
            },
            temporalProfile: function (evt) {
              var getSamplesRequest, items, itemInfo, itemInfoNdmi, itemInfoUrban, normalizedValues, normalizedValuesNdmi, normalizedValuesUrban, ndvi, ndmi, urban, nir, red,  swir1,  byDate, byDateNdmi, byDateUrban;
              registry.byId("timeDialog").hide();
              this.ischartShow = true;
              this.clear();
              domStyle.set(dom.byId("loadingTimeProfile"), "display", "block");
              getSamplesRequest = esriRequest({
                url: this.primaryLayer.url + "/getSamples",
                content: {
                  geometry: JSON.stringify(evt.toJson()),
                  geometryType: "esriGeometryPoint",
                  returnGeometry: false,
                  returnFirstValueOnly: false,
                  outFields: this.layerInfos[this.label].acquisitionDate+','+this.layerInfos[this.label].objectID+','+this.layerInfos[this.label].groupName+','+this.layerInfos[this.label].category,
                  pixelSize: [this.primaryLayer.pixelSizeX, this.primaryLayer.pixelSizeY],
                  mosaicRule: JSON.stringify(this.primaryLayer.mosaicRule),
                  f: "json"
                },
                handleAs: "json",
                callbackParamName: "callback"
              });
              getSamplesRequest.then(lang.hitch(this, function (data) {
                items = data.samples;
                itemInfo = [];
                itemInfoNdmi = [];
                itemInfoUrban = [];
                for (var a in items) {
                  if (items[a].attributes[this.layerInfos[this.label].category] === 1) {
                    var plot = items[a].value.split(' ');
                    for (var k in plot) {
                      if (plot[k]) {
                        plot[k] = parseInt(plot[k], 10);
                      } else {
                        plot[k] = 0;
                      }
                    }
                    normalizedValues = [];
                    normalizedValuesNdmi = [];
                    normalizedValuesUrban = [];
                    if(this.layerInfos[this.label].nirIndex && this.layerInfos[this.label].redIndex){
                    nir = plot[this.layerInfos[this.label].nirIndex];
                    red = plot[this.layerInfos[this.label].redIndex];
                    ndvi = (nir - red) / (red + nir);
                     normalizedValues.push(
                            {y: ndvi,
                              tooltip: ndvi.toFixed(3) + ", " + locale.format(new Date(items[a].attributes[this.layerInfos[this.label].acquisitionDate]), {selector: "date", datePattern: "dd/MM/yy"})});
                           itemInfo.push({
                      acqDate: items[a].attributes[this.layerInfos[this.label].acquisitionDate],
                      objid: items[a].attributes[this.layerInfos[this.label].objectID],
                      values: normalizedValues,
                      name: items[a].attributes[this.layerInfos[this.label].groupName]
                    });
                
                          }
                    if(this.layerInfos[this.label].swirIndex) {
                    swir1 = plot[this.layerInfos[this.label].swirIndex];
                    ndmi = ((nir - swir1) / (nir + swir1));
                    urban = (((swir1 - nir) / (swir1 + nir)) - ((nir - red) / (red + nir))) / 2;
                 normalizedValuesNdmi.push(
                            {y: ndmi,
                              tooltip: ndmi.toFixed(3) + ", " + locale.format(new Date(items[a].attributes[this.layerInfos[this.label].acquisitionDate]), {selector: "date", datePattern: "dd/MM/yy"})});
                    normalizedValuesUrban.push(
                            {y: urban,
                              tooltip: urban.toFixed(3) + ", " + locale.format(new Date(items[a].attributes[this.layerInfos[this.label].acquisitionDate]), {selector: "date", datePattern: "dd/MM/yy"})});
                    
                    
                    itemInfoNdmi.push({
                      acqDate: items[a].attributes[this.layerInfos[this.label].acquisitionDate],
                      objid: items[a].attributes[this.layerInfos[this.label].objectID],
                      values: normalizedValuesNdmi,
                      name: items[a].attributes[this.layerInfos[this.label].groupName]
                    });
                    itemInfoUrban.push({
                      acqDate: items[a].attributes[this.layerInfos[this.label].acquisitionDate],
                      objid: items[a].attributes[this.layerInfos[this.label].objectID],
                      values: normalizedValuesUrban
                    });
                  }
                }
            }
            if(itemInfo[0]){
                byDate = itemInfo.slice(0);
                byDate.sort(function (a, b) {
                  return a.acqDate - b.acqDate;
                });
                this.NDVIData = byDate;
            }
            if(itemInfoNdmi[0] && itemInfoUrban[0]){
            byDateNdmi = itemInfoNdmi.slice(0);
                byDateUrban = itemInfoUrban.slice(0);
                
                byDateNdmi.sort(function (a, b) {
                  return a.acqDate - b.acqDate;
                });
                byDateUrban.sort(function (a, b) {
                  return a.acqDate - b.acqDate;
                });
              
                this.NDMIData = byDateNdmi;
                this.UrbanData = byDateUrban;
            }  this.NDVIValues = [];
                this.NDMIValues = [];
                this.UrbanValues = [];
                this.NDVIDates = [];
                if(this.NDVIData){
                for (var a = 0; a < this.NDVIData.length; a++) {
                  this.NDVIDates.push({
                    text: locale.format(new Date(this.NDVIData[a].acqDate), {selector: "date", datePattern: "dd/MM/yy"}),
                    value: parseInt(a) + 1
                  });
                  this.NDVIValues.push({
                    y: this.NDVIData[a].values[0].y,
                    tooltip: this.NDVIData[a].values[0].tooltip
                  });
                }}
            if(this.NDMIData && this.UrbanData) {
                for (a in this.NDMIData) {
                  this.NDMIValues.push({
                    y: this.NDMIData[a].values[0].y,
                    tooltip: this.NDMIData[a].values[0].tooltip
                  });
                }
                for (a in this.UrbanData) {
                  this.UrbanValues.push({
                    y: this.UrbanData[a].values[0].y,
                    tooltip: this.UrbanData[a].values[0].tooltip
                  });
                }
            }
                this.axesParams = [];
                for (a in this.layerInfos[this.label].bandNames) {
                  this.axesParams[a] = {
                    value: parseInt(a) + 1,
                    text: this.layerInfos[this.label].bandNames[a]
                  };
                }
                
               // if (!this.chart) {
                  html.set(this.pointForTemporalProfile, "");
                  html.set(this.pointOnGraph, strings.pointOnGraph);
                  if (!registry.byId("timeDialog").open) {
                    registry.byId("timeDialog").show();
                  }
                  this.chart = new Chart("chartNodes");
                  this.chart.addPlot("default", {
                    type: "Lines",
                    tension: "S",
                    markers: true,
                    shadows: {dx: 4, dy: 4}
                  });
                  this.chart.setTheme(theme);
                  this.count = 1;
                  this.chart.addAxis("y", {vertical: true, fixLower: "major", fixUpper: "major", title: "Data Values", titleOrientation: "axis"});
                  this.chart.addAxis("x", {labels: this.NDVIDates, labelSizeChange: true, title: "Acquisition Date", titleOrientation: "away", majorTickStep: 1, minorTicks: false});
                  if(this.NDMIValues){
                  this.chart.addSeries("NDMI Moisture", this.NDMIValues, {stroke: {color: "#A5F2F3",width: 1.5},fill: "#A5F2F3",hidden: true});
                  this.chart.addSeries("Urban", this.UrbanValues, {stroke: {color: "teal",width: 1.5},fill: "teal",hidden: true});
              }
              if(this.NDVIValues)
                  this.chart.addSeries("NDVI Vegetation", this.NDVIValues,{stroke: {color: "forestgreen",width: 1.5},fill: "forestgreen"});
                  
                  
                  this.toolTip = new Tooltip(this.chart, "default");
                  this.magnify = new Magnify(this.chart, "default");
                  this.chart.render();
                
                  domConstruct.destroy("timeDialog_underlay");
                 if(!this.legend)
                        this.legend = new SelectableLegend({chart: this.chart, horizontal: true, outline: false}, "legends");
                            else{
                                     this.legend.set("params", {chart: this.chart, horizontal: true, outline: false});
                                        this.legend.set("chart", this.chart);
                                        this.legend.refresh();
                                    }
                this.chart.connectToPlot("default", lang.hitch(this, this.clickdata));
                html.set(this.pointOnGraph, strings.pointOnGraph);
                domStyle.set("sliderRules", "display", "none");
                domStyle.set("sliderLabels", "display", "none");
                domStyle.set("slider", "display", "none");
                domStyle.set(dom.byId("loadingTimeProfile"), "display", "none");
              }), lang.hitch(this, function (error) {
                domStyle.set(dom.byId("loadingTimeProfile"), "display", "none");
              }));
            },
            clickdata: function (evt) {
              var eventType = evt.type;
              if (eventType === "onclick") {
                this.datesClicked = (evt.x - 1);
                for (var g = 0; g < this.graphId.length; g++) {
                  if ((this.graphId[g].date === this.NDVIData[this.datesClicked].acqDate)) {
                    this.slider.set("value", g);
                   // this.sliderChange();
                  }
                 
                }
              }
            },
            setFilterDiv: function () {
              if (registry.byId("timeLineFilter").get("checked")) {
                if (!this.slider) {
                  this.timeSliderShow();
                } else {
                  this.timeSliderRefresh();
                }
                domStyle.set(this.filterDivContainer, "display", "block");

               
                this.toolbarTemporalProfile.activate(Draw.POINT);
              } else {
                domStyle.set(this.filterDivContainer, "display", "none");
                registry.byId("timeDialog").hide();
                this.ischartShow = false;
                this.clear();
                html.set(this.pointForTemporalProfile, "");
               this.toolbarTemporalProfile.deactivate();
                if (this.mosaicBackup) {
                  var mr = new MosaicRule(this.mosaicBackup);
                } else {
                  var mr = new MosaicRule(this.defaultMosaicRule);
                  //var mr = new MosaicRule({"mosaicMethod": "esriMosaicNone", "ascending": true, "mosaicOperation": "MT_FIRST"});
                }
                this.primaryLayer.setMosaicRule(mr);
              }
            },
            timeSliderShow: function () {
              var extent, xlength, ylength, xminnew, yminnew, xmaxnew, ymaxnew, extentnew, query, queryTask, sliderNode, rulesNode, labels, labelsNode, polygonJson, polygon, imageTask, maxVisible, imageParams, index;
              if (this.primaryLayer && registry.byId("timeLineFilter").get("checked")) {
                this.graphId = [];
                extent = new Extent(this.map.extent);
                xlength = (extent.xmax - extent.xmin) / 4;
                ylength = (extent.ymax - extent.ymin) / 4;
                xminnew = extent.xmin + xlength;
                xmaxnew = extent.xmax - xlength;
                yminnew = extent.ymin + ylength;
                ymaxnew = extent.ymax - ylength;
                extentnew = new Extent(xminnew, yminnew, xmaxnew, ymaxnew, extent.spatialReference);

                query = new Query();
                query.geometry = extentnew;
                query.outFields = [this.dateField];
                query.where = this.layerInfos[this.label].category+" = 1";
                query.orderByFields = [this.dateField];
                query.returnGeometry = false;
                this.showLoading();

                queryTask = new QueryTask(this.primaryLayer.url);
                queryTask.execute(query, lang.hitch(this, function (result) {
                  this.orderedFeatures = result.features;
                  this.orderedDates = [];
                  for (var a in this.orderedFeatures) {
                    this.orderedDates.push(this.orderedFeatures[a].attributes[this.dateField]);
                  }
                  this.featureLength = this.orderedFeatures.length;
                  sliderNode = domConstruct.create("div", {}, this.timeSliderDiv, "first");
                  rulesNode = domConstruct.create("div", {}, sliderNode, "first");

                  this.sliderRules = new HorizontalRule({
                    id: "sliderRules",
                    container: "bottomDecoration",
                    count: this.featureLength,
                    style: "height:5px;"
                  }, rulesNode);

                  labels = [];
                  for (var i = 0; i < this.orderedDates.length; i++) {
                    labels[i] = locale.format(new Date(this.orderedDates[i]), {selector: "date", datePattern: "dd/MM/yy"}); //formatLength: "short"});
                  }
                  for (var i = 0; i < this.orderedDates.length; i++) {
                    this.graphId.push({
                      date: this.orderedDates[i],
                      obj: this.orderedFeatures[i].attributes[this.layerInfos[this.label].objectID],
                      name: this.orderedFeatures[i].attributes[this.layerInfos[this.label].groupName]
                    });
                  }
                  labelsNode = domConstruct.create("div", {}, sliderNode, "second");

                  this.sliderLabels = new HorizontalRuleLabels({
                    id: "sliderLabels",
                    container: "bottomDecoration",
                    labelStyle: "height:1em;font-size:75%;color:gray;",
                    labels: [labels[0], labels[this.orderedDates.length - 1]]
                  }, labelsNode);

                  this.slider = new HorizontalSlider({
                    id: "slider",
                    name: "slider",
                    value: 0,
                    minimum: 0,
                    maximum: this.featureLength - 1,
                    discreteValues: this.featureLength,
                    showButtons: true,
                    onChange: lang.hitch(this, this.sliderChange)
                  }, sliderNode);

                  this.slider.startup();
                  this.sliderRules.startup();
                  this.sliderLabels.startup();

                  polygonJson = {"rings": [[[extent.xmin, extent.ymin], [extent.xmin, extent.ymax], [extent.xmax, extent.ymax], [extent.xmax, extent.ymin],
                        [extent.xmin, extent.ymin]]], "spatialReference": {"wkid": 102100}};
                  polygon = new Polygon(polygonJson);
                  var request = new esriRequest({
                                  url: this.primaryLayer.url + "/getSamples",
                            content: {
                                geometry: JSON.stringify(this.map.extent.getCenter()),
                                geometryType: "esriGeometryPoint",
                                returnGeometry: false,
                                sampleCount: 1,
                                outFields: this.objectID,
                                f: "json"
                            },
                            handleAs: "json",
                            callbackParamName: "callback"
                        });
                                request.then(lang.hitch(this, function(bestScene){
                                     var maxVisible = bestScene.samples[0].attributes[this.objectID];
                                        for (var z in this.orderedFeatures) {
                                            if (this.orderedFeatures[z].attributes[this.objectID] === maxVisible) {
                                                var index = z;
                                            }
                                        }
                                        this.slider.set("value", index);
                                        this.sliderChange();
                                    
                                   html.set(this.dateRange, locale.format(new Date(this.orderedDates[this.featureLength - 1]), {selector: "date", formatLength: "long"}));
                                    html.set(this.imageCount, "1");
                                    this.hideLoading();
                                }), lang.hitch(this, function(){
                                    
                  imageTask = new ImageServiceIdentifyTask(this.primaryLayer.url);
                  imageParams = new ImageServiceIdentifyParameters();
                  imageParams.geometry = new Point(polygon.getCentroid());
                  imageParams.returnGeometry = false;

                  imageTask.execute(imageParams, lang.hitch(this, function (data) {
                    if (data.catalogItems.features[0]) {
                      maxVisible = data.catalogItems.features[0].attributes[this.layerInfos[this.label].objectID];
                      for (var z in this.orderedFeatures) {
                        if (this.orderedFeatures[z].attributes[this.layerInfos[this.label].objectID] === maxVisible) {
                          index = z;
                        }
                      }
                      this.slider.set("value", index);
                     // this.sliderChange();
                    }
                    html.set(this.dateRange, locale.format(new Date(this.orderedDates[this.featureLength - 1]), {selector: "date", formatLength: "long"}));
                    this.hideLoading();
                  }), lang.hitch(this, function (error) {
                    this.hideLoading();
                    this.slider.set("value", 0);
                    this.sliderChange();
                  }));
              }));
                  this.hideLoading();
                }), lang.hitch(this, function (error) {
                  this.hideLoading();
                }));
              }
            },
            timeSliderHide: function () {
              this.sliderRules.destroy();
              this.sliderLabels.destroy();
              this.slider.destroy();
            },
            sliderChange: function () {
              var aqDate, featureSelect;
              if (registry.byId("timeLineFilter").get("checked")) {
                this.sliderValue = this.slider.get("value");
                aqDate = this.orderedFeatures[this.slider.get("value")].attributes[this.dateField];
                featureSelect = [];
                this.featureIds = [];

                featureSelect.push(this.orderedFeatures[this.slider.get("value")]);
                this.featureIds.push(this.orderedFeatures[this.slider.get("value")].attributes[this.layerInfos[this.label].objectID]);
                html.set(this.dateRange, locale.format(new Date(aqDate), {selector: "date", formatLength: "long"}));

                var mr = new MosaicRule();
                mr.method = MosaicRule.METHOD_LOCKRASTER;
                mr.ascending = true;
                mr.operation = "MT_FIRST";
                mr.lockRasterIds = this.featureIds;
                this.primaryLayer.setMosaicRule(mr);
              }
            },
            timeSliderRefresh: function () {
              if (this.slider) {
                this.timeSliderHide();
                this.timeSliderShow();
                registry.byId("timeDialog").hide();
                this.clear();
                this.ischartShow = false;
              }
            },
            showLoading: function () {
              domStyle.set("loadingTimeProfile","display","block");
            },
            hideLoading: function () {
              domStyle.set("loadingTimeProfile","display","none");
            }
          });
          clazz.hasLocale = false;
          return clazz;
        });