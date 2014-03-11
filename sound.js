// sound.js


var beep = (function () {
    var ctx = new(window.audioContext || window.webkitAudioContext);
    return function (duration, type, finishedCallback) {
        if (!duration) duration = 60;
        if (!type) type = 0;
        duration = +duration;
        type = (type % 5) || 0;  // Only 0-4 are valid types.
        if (typeof finishedCallback != "function") {
            finishedCallback = function () {};
        }

        var osc = ctx.createOscillator();
        //var reverb = ctx.createConvolver();
        var gain = ctx.createGainNode();
        gain.gain.value = 0.17;
        osc.type = type;
        osc.frequency.value = 880*1.5;
        osc.connect(gain);
        //osc.connect(reverb);
        //reverb.connect(gain);
        gain.connect(ctx.destination);

        osc.noteOn(0);
        setTimeout(function () { osc.noteOff(0); finishedCallback(); }, duration);
    };
})();








var Player = {

    current: {},

    clear: function(){
        if (Player.current.sound){
            Player.current.sound.stop();
            Player.current.sound.unload();
        }
        if (Player.current.indicator) {
            Player.current.indicator('removing');
        }
        Player.current = {};
    },

    stream: function(method, track, indicator, options){
        if (track == Player.current.track) return;
        if (!options) options = {};
        if (Player.current.track) Player.clear();
        Player.current.track = track;
        Player.current.indicator = indicator;
        SC.stream(track, function(sound){
            if (!sound || !sound[method]) { console.log(sound); return; }
            Player.current.sound = sound;
            if (indicator){
                indicator('loading');
                options.onplay=function(){ indicator('playing'); };
                options.onpause=function(){ indicator('paused'); };
                options.onresume=function(){ indicator('playing'); };
            }
            sound[method](options);
        });
    }

};


function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
