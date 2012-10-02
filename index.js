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
    if (this.playQueue){
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
    }
}

// xhr object with data we will send to API
NowPlaying.prototype.getRequestObj = function(url, context, eventType){
    if (this.song.id){
        url = url+"/"+this.song.id;
    }
    var data = {
        'title': this.song.title,
        'artist': this.song.artist,
        'album': this.song.album,
        'source': this.song.source
    }
    if (context){
        data.context = context;
    }
    if (this.clientId){
        data.client_id = this.clientId;
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
NowPlaying.prototype.onStart = function(e, context){
    this.start(e.target.song, context);
}

// manually call this when song starts (if listener is not on)
NowPlaying.prototype.start = function(song, context){
    this.song = song;
    this.setTitle();
    $.ajax(
        this.getRequestObj(
            this.nowPlayingUrl, 
            context, 
            "start"
        )
    );
}

// listener for when song reaches halfway mark
NowPlaying.prototype.onHalf = function(e, context){
    this.half(e.target.song, context);
}

// manually call this when song reaches halfway mark (if listener is not on)
NowPlaying.prototype.half = function(song, context){
    this.song = song;
    $.ajax(
        this.getRequestObj(
            this.scrobbleUrl, 
            context, 
            "half"
        )
    );
}

// when PlayQueue fires 'stop' event, set page title back to original state
NowPlaying.prototype.onStop = function(e, context){
    if (this.pageTitle){
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
    if(this.audio != null){
        if(this.audio.paused == false){
            title = "f"; 
        } 
    } 
    if(this.song.title){
        if(this.audio != null){
            if(this.audio.paused == false){
                title = "f "+this.song.title;
            }
            else{
                title = this.song.title;
            }
        } 
        else{
            title = this.song.title;
        }
    }
    if(this.song.artist){
        title += " by "+this.song.artist;
    }
    if(this.pageTitle){
        title += " - "+this.pageTitle;
    }
    this.title = this.replaceHTMLEncoding(title);
    if(this.shouldSetTitle == true){
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


// check if we've got require
if(typeof module !== "undefined"){
    module.exports = NowPlaying;
}
else{
    window.NowPlaying = NowPlaying;
}

}());