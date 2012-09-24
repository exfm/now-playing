"use strict";

describe("now-playing", function(){
    it("should create a new NowPlaying object", function(){
        var np = new NowPlaying();
        console.log(np);
        assert.equal(typeof(np.song), 'object');
    });
});