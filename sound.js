// sound.js


var beep = (function () {
    var ac = window.audioContext || window.webkitAudioContext;
    if (!ac) return;
    var ctx = new(ac);
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
        if (Player.indicator) Player.indicator('notrack');
        Player.current = {};
    },

    ui: function(indicator){
        if (indicator) Player.indicator = indicator;
    },

    stream: function(method, track, indicator, options){
        if (indicator) Player.ui(indicator);
        Player.track(method, track, options && options.title);
    },

    track: function(method, track, title){
        if (track == Player.current.track) return;
        if (Player.current.track) Player.clear();
        Player.current.track = track;
        Player.current.title = title;
        var load_happened = false;
        if (Player.indicator) Player.indicator('loading');
        setTimeout(function () {
            if (Player.indicator && !load_happened) Player.indicator('load_failed');
        }, 20000);
        SC.stream(track, function(sound){
            load_happened = true;
            if (!sound || !sound[method]) { console.log(sound); return; }
            Player.current.sound = sound;

            var indicator = Player.indicator;
            if (indicator && method == 'play') indicator('playing');
            else if (indicator) indicator('paused');

            var options = {};
            options.onplay=function(){   if (Player.indicator) Player.indicator('playing'); };
            options.onpause=function(){  if (Player.indicator) Player.indicator('paused'); };
            options.onresume=function(){ if (Player.indicator) Player.indicator('playing'); };
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
