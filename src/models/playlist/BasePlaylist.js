var Crypto = require('crypto');
var EventEmitter = require('events').EventEmitter;
var BaseTrack = require('../track/BaseTrack');
var YoutubeTrack = require('../track/YoutubeTrack');
var VimeoTrack = require('../track/VimeoTrack');

var supportedTracks = {
  BaseTrack: BaseTrack,
  YoutubeTrack: YoutubeTrack,
  VimeoTrack: VimeoTrack
};

function BasePlaylist(options) {
  options = options || {};

  EventEmitter.call(this);
  this.id = options.id || Crypto.randomBytes(3).toString('hex');
  this.platformId = options.id || '';
  this.name = options.name || 'playlist';
  this.type = options.type || 'normal';
  this._tracks = options._tracks || [];
}

BasePlaylist.prototype = Object.create(EventEmitter.prototype);
BasePlaylist.constructor = BasePlaylist;

Object.defineProperty(BasePlaylist.prototype, 'tracks', {
  enumerable: true,
  configurable: false,
  get: function() {
    return this._tracks;
  }
});

// static method
BasePlaylist.fromJSON = function(json) {
  var tracks = json._tracks.map((rawTrackInfo) => {
    var trackType = rawTrackInfo.trackType;
    var trackConstructor = supportedTracks[trackType];
    if (!trackConstructor) {
      console.error('This track may lose some data, let\'s just drop it');
      return;
    }
    else {
      return new trackConstructor(rawTrackInfo);
    }
  });

  // TODO
  // we may need to support different playlist here
  return new BasePlaylist({
    id: json.id,
    platformId: json.platformId,
    name: json.name,
    _tracks: tracks
  });
};

BasePlaylist.prototype.addTrack = function(track, options) {
  options = options || {};
  var self = this;
  var promise = new Promise((resolve, reject) => {
    var title = track.title;
    var artist = track.artist;
    var foundTrack = self.findTrackByArtistAndTitle(artist, title);
    if (foundTrack) {
      reject('You already have a track with same name & artist, ' +
        'please try another one');
    }
    else {
      self._tracks.push(track);
      if (!options.dontEmitEvent) {
        self.emit('tracksUpdated');
      }
      resolve();
    }
  });
  return promise;
};

BasePlaylist.prototype.addTracks = function(tracks) {
  if (tracks.length <= 0) {
    return Promise.resolve();
  }
  else {
    var self = this;
    var promises = tracks.map((track) => {
      return self.addTrack(track, {
        dontEmitEvent: true
      });
    });
    // We need to trigger update event in the end to make sure we won't
    // make db conflicted.
    return Promise.all(promises).then(() => {
      self.emit('tracksUpdated');
    });
  }
};

BasePlaylist.prototype.removeTrack = function(track) {
  var self = this;
  var promise = new Promise((resolve, reject) => {
    var index = self.findTrackIndex(track);
    if (index === -1) {
      reject('Can\'t find the track');
    }
    else {
      var removedTrack = self._tracks.splice(index, 1);
      console.log('Removed track - ', removedTrack);

      self.emit('tracksUpdated');
      resolve();
    }
  });
  return promise;
};

BasePlaylist.prototype.findTrackIndex = function(track) {
  return this._tracks.indexOf(track);
};

BasePlaylist.prototype.findTrackByArtistAndTitle = function(artist, title) {
  // We assume that there is only one track with same title & artist
  var tracks = this._tracks.filter((track) => {
    return (track.title === title) && (track.artist === artist);
  });
  return tracks[0];
};

BasePlaylist.prototype.findTracksByTitle = function(title) {
  return this._tracks.filter((track) => {
    return track.title === title;
  });
};

BasePlaylist.prototype.findTracksByArtist = function(artist) {
  return this._tracks.filter((track) => {
    return track.artist === artist;
  });
};

BasePlaylist.prototype.isSameWith = function(anotherPlaylist) {
  return this.id === anotherPlaylist.id;
};

BasePlaylist.prototype.toJSON = function() {
  var tracks = this._tracks.map((track) => {
    return track.toJSON();
  });

  return {
    id: this.id,
    platformId: this.platformId,
    name: this.name,
    type: this.type,
    _tracks: tracks
  };
};

module.exports = BasePlaylist;
