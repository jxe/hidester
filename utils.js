//utils.js

// function reflip(){
//    if (!Player.current.sound || !sorted_actions) return;
//    if (!Player.current.sound.position) return;
//    var s = Player.current.sound.position / 1000;
//    var last_flipped;
//    for (var i = 0; i < sorted_actions.length; i++) {
//       var a = sorted_actions[i];
//       if (Math.abs(a.t - s) < 5) {
//          $(a.id).className = "show";
//          last_flipped = i;
//       } else {
//          $(a.id).className = "hide";
//       }
//    }
//    var next;
//    if (last_flipped !== undefined) {
//       next = sorted_actions[last_flipped+1];
//       if (next === undefined){
//          next_flip_time = s+10000;
//       } else {
//          next_flip_time = next.t - 5;
//       }
//    }
//    return last_flipped;
// }
