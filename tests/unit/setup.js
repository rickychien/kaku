'use strict';

var assert = require('assert');
var chai = require('chai');
var sinon = require('sinon');
var jsdom = require('jsdom').jsdom;
var proxyquire = require('proxyquire');

// We have to fake window object in node.js environment
var document = jsdom('_');
global.window = document.defaultView;
global.assert = chai.assert;
global.sinon = sinon;
global.proxyquire = proxyquire;
