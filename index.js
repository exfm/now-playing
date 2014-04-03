(function(){

"use strict";

// constructor
function NowPlaying(opts){
    
    // should we set the doc title to current song?
    this.shouldSetTitle = true;
        
    
    // extend all options passed in to this
    $.extend(this, opts);
    
    // add playqueue and audio listeners
    this.addListeners();
    
    // current song
    this.song = {};
    
    // current title
    this.title = null;
    
    // cache offline scrobbles to send 
    // when we are back online
    this.offlineScrobbles = [];
    
    // extend event emitter
    var eventEmitter;
    if(typeof module !== "undefined"){
        var EventEmitter = require('event-emitter');
        eventEmitter = new EventEmitter();
    }
    else{
        eventEmitter = new window.EventEmitter();
    }
    $.extend(this, eventEmitter);
}

// add playqueue and audio listeners
NowPlaying.prototype.addListeners = function(){
    if(this.playQueue){
        this.playQueue.addEventListener(
            "playing", 
            this.onStart.bind(this), 
            false
        );
        this.playQueue.addEventListener(
            "songHalf", 
            this.onHalf.bind(this), 
            false
        );
        this.playQueue.addEventListener(
            "stop", 
            this.onStop.bind(this), 
            false
        );
        this.playQueue.addEventListener(
            "error", 
            this.onError.bind(this), 
            false
        );
        this.audio = this.playQueue.audio;
    }
    if(this.audio){
        this.audio.addEventListener(
            "pause", 
            this.setTitle.bind(this), 
            false
        );
        this.audio.addEventListener(
            "play", 
            this.setTitle.bind(this), 
            false
        );
    };
    document.addEventListener(
        'online',
        this.onOnline.bind(this), 
        false
    );
}

// xhr object with data we will send to API
NowPlaying.prototype.getRequestObj = function(url, eventType){
    if(this.song.id){
        url = url + '/' + this.song.id;
        if(eventType === 'error'){
            url = url + '/error';
        }
    }
    var data = {};
    if(this.song.title){
        data.title = this.song.title;
    }
    if(this.song.artist){
        data.artist = this.song.artist;
    }
    if(this.song.album){
        data.album = this.song.album;
    }
    if(this.song.source){
        data.source = this.song.source;
    }
    if(this.song.context){
        data.context = this.song.context;
    }
    if(this.clientId){
        data.client_id = this.clientId;
    }
    if(this.song.play_token){
        data.play_token = this.song.play_token;
    }
    return {
        'url': url,
        'success': function(data){
            this.serverSong = data.song;
            this.emit(eventType, this);
        }.bind(this), 
        'type': "POST",
        'data':  data
    }
}

// listener for when song starts
NowPlaying.prototype.onStart = function(e){
    this.start(e.target.song);
}

// manually call this when song starts (if listener is not on)
NowPlaying.prototype.start = function(song){
    this.song = song;
    this.setTitle();
    var requestObj = this.getRequestObj(
        this.nowPlayingUrl, 
        'start'
    );
    if(navigator.onLine === true){
        $.ajax(
            requestObj
        );
    }
    else{
        requestObj.success({
            'song': this.song 
        });
    }
}

// listener for when song reaches halfway mark
NowPlaying.prototype.onHalf = function(e){
    this.half(e.target.song);
}

// manually call this when song reaches halfway mark (if listener is not on)
NowPlaying.prototype.half = function(song){
    this.song = song;
    var requestObj = this.getRequestObj(
        this.scrobbleUrl, 
        'half'
    );
    if(navigator.onLine === true){
        $.ajax(
            requestObj
        );
    }
    else{
        requestObj.success({
            'song': this.song 
        });
        requestObj.data.timestamp = Math.round(new Date().getTime() / 1000);
        this.offlineScrobbles.push(requestObj);
    }
}

// listener for when there is a song load error
NowPlaying.prototype.onError = function(e){
    this.error(e.target.song);
}

// manually call this when there is a song load error
NowPlaying.prototype.error = function(song){
    if(song.id){
        this.song = song;
        var requestObj = this.getRequestObj(
            this.errorUrl, 
            'error'
        );
        if(navigator.onLine === true){
            $.ajax(
                requestObj
            );
        }
        else{
            requestObj.success({
                'song': this.song 
            });
        }
    }
}

// when PlayQueue fires 'stop' event, set page title back to original state
NowPlaying.prototype.onStop = function(e){
    if(this.pageTitle){
        this.title = this.pageTitle;
    }
    else {
        this.title = "";
    }
    this.emit('titleChanged', 
        {
            'title': this.title
        }
    );
}

// convenience method to get page title
NowPlaying.prototype.getTitle = function(){
    return this.title;
}

// set the page title. Check if song is playing, paused or stopped
NowPlaying.prototype.setTitle = function(){
    var title = "";
    if(this.song.title){
        title = this.song.title;
    }
    if(this.song.artist){
        title += " by "+ this.song.artist;
    }
    if(this.pageTitle){
        title += " - " + this.pageTitle;
    }
    this.title = this.replaceHTMLEncoding(title);
    if(this.shouldSetTitle === true){
        document.title = this.title;
    }
    this.emit('titleChanged', 
        {
            'title': this.title
        }
    );
}

// reset page title to original state
NowPlaying.prototype.resetTitle = function(){
    if(this.pageTitle){
        document.title = this.pageTitle;
    }
}

// need to encode some chars for page title in browser
NowPlaying.prototype.replaceHTMLEncoding = function(str){
    str = str.replace(/&#8220;/g, '"');
    str = str.replace(/&#8221;/g, '"');
    str = str.replace(/&#8217;/g, "'");
    str = str.replace(/&#8230;/g, "...");
    str = str.replace(/&amp;/g, "&");
    return str;
}

// listener for 'online' event. 
// Send any un-sent scrobbles
NowPlaying.prototype.onOnline = function(e){
    if(navigator.onLine === true){
        $.each(
            this.offlineScrobbles,
            function(index, requestObj){
                requestObj.success = function(){};
                $.ajax(
                    requestObj
                );
            }
        );
        this.offlineScrobbles = [];
    }
}


// check if we've got require
if(typeof module !== "undefined"){
    module.exports = NowPlaying;
}
else{
    window.NowPlaying = NowPlaying;
}

}());