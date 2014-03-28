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
    stop: function(){
      if (Player.current.sound) Player.current.sound.stop();
      Player.is('paused');
    },
    start_over: function(){
        if (!Player.current.sound) return;
        Player.current.sound.setPosition(0);
        Player.current.sound.play();
        Player.is('playing');
    },
    clear: function(){
        if (Player.current.sound){
            Player.current.sound.stop();
            Player.current.sound.unload();
        }
        Player.is('notrack');
        Player.current = {};
    },
    ui: function(indicator){
        if (indicator) Player.indicator = indicator;
        if (Player.state) Player.is(Player.state);
    },
    is: function(state){
          Player.state = state;
          if (Player.indicator) Player.indicator(Player.state);
    },
    // obsolete
    stream: function(method, track, indicator, options){
        if (indicator) Player.ui(indicator);
        Player.track(method, track, options && options.title);
    },
    track: function(method, track, title){
        if (track == Player.current.track) return;
        if (Player.current.track) Player.clear();
        Player.current.track = track;
        Player.current.title = title;
        Player.current.sound = null;
        Player.is('loading');
        setTimeout(function () { if (!Player.current.sound) Player.is('load_failed'); }, 20000);
        SC.stream(track, function(sound){
            if (!sound || !sound[method]) return;
            Player.current.sound = sound;
            //if (method == 'play') Player.is('playing');
            //else Player.is('paused');
            sound[method]({
                onplay: function(){   Player.is('playing'); },
                onpause: function(){  Player.is('paused'); },
                onresume: function(){ Player.is('playing'); },
                onfinish: function(){ Player.is('paused'); Player.current.sound.setPosition(0); },
                onload: function(){ (method == 'play') ? Player.is('playing') : Player.is('paused'); }
            });
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
