
// set up firebase
function login(){ auth.login('facebook', { rememberMe: true }); }
document.getElementById('login').onclick = login;
if (navigator.standalone) document.getElementsByTagName('body')[0].className = 'standalone';


// set up sc
SC.initialize({client_id: "43963acff2ef28ec55f039eddcea8478"});



window.reveal = firewidget.reveal;



// globals

var playlist, curloc, riddle_answer;
var genres = "80s, ambient, americana, avantgarde, blues, chiptunes, choir, electronic, hip-hop, glitch, gregorian, gospel, orchestral, piano, arabic, chillout, classical, dirty south, dub, funk, jazz, trance".split(', ').map(function (x){
    return {name: x};
});

// functions

function values(obj){
    if (!obj) return [];
    return Object.keys(obj).map(function(x){ obj[x].id = x; return obj[x]; });
}

function hop_to_room(room_id, fn) {
    if (!fn) fn = 'unlock_page';
    fb('rooms/%', room_id).once('value', function (snap) {
        var v = snap.val();
        if (!v) return;
        v.id = room_id;
        if (fn == 'unlock_page' && v.members && v.members[current_user_id]) fn = 'show_room';
        window[fn](v);
    });
}

function short_name(){
    if (!facebook_name) return "Anon";
    var words = facebook_name.split(' ');
    return words[0] + ' ' + words[1][0] + '.';
}

function compact(arr){
    return arr.filter(function(x){ return x; });
}

function join_room(r){
    fb('rooms/%/members/%', r.id, current_user_id).set({
        name: short_name(),
        facebook_id: facebook_id
    });
    show_room(r);
}

function user_is_in_location_for_room(r){
    if (!curloc) return false;
    if (!r.start_loc) return true;
    var km = distance(r.start_loc[0], r.start_loc[1], curloc[0], curloc[1]);
    if (km < 0.090) return true;
}

function user_has_solved_riddle_for_room(room){
    if (!room.riddle_a) return true;
    if (!riddle_answer) return false;
    return riddle_answer.toLowerCase() == room.riddle_a.toLowerCase();
}


function room_attributes_from_soundcloud_track(data){
    return {
        soundcloud_url: "/tracks/" + data.id,
        soundcloud_id: data.id,
        waveform_url: data.waveform_url,
        song_title: data.title,
        duration: data.duration / 1000,
        created_at: (new Date()).getTime()
    };
}


function distance_to_room(r) {
    if (!curloc) return '';
    if (!r.start_loc) return 'global';
    var km = distance(r.start_loc[0], r.start_loc[1], curloc[0], curloc[1]);
    var meters = Math.floor(km*1000);
    var dist = meters + 'm';
    if (meters > 1000) dist = Math.floor(meters/100)/10 + 'km';
    var brng = english_bearing(bearing(curloc[0], curloc[1], r.start_loc[0], r.start_loc[1]));
    if (meters < 15) return "Here";
    else return dist + " " + brng;
}



function nextSong(room){
    if (!playlist || playlist.errors || playlist.length === 0) return;
    var data = playlist.pop();
    fb('rooms/%', room.id).update(room_attributes_from_soundcloud_track(data));
    Player.stream('play', "/tracks/" + data.id);
}



// all pages

var last_tab_in_rooms;

function rooms(link_from, default_tab){
    reveal('.page', 'rooms', {
        backlink_header: link_from,
        rooms_back: [function () {
            show_room(link_from);
        }, !!link_from],
        room_create: function(){
            if (!current_user_id) return alert('Please log in with FB!  Future version of this software will give you other options.');
            var new_room = { author: current_user_id };
            new_room.id = fb('rooms').push(new_room).name();
            if (link_from) link_room_to_room(link_from, new_room);
            else join_room(new_room);
        },
        room_index_type: [['Global', 'Nearby', 'All'], function (tabname, ev) {
            last_tab_in_rooms = tabname;
            if (tabname == 'Nearby' && (!curloc || ev)) return with_loc(function () { rooms(link_from, 'Nearby'); });
            reveal('#rooms #rooms_list', 'rooms_list', {
                rooms_list: [fb('rooms'), function(room_entry){
                    if (!current_user_id) return alert('Please log in with FB! Future version of this software will give you other options.');
                    if (link_from) return link_room_to_room(link_from, room_entry);
                    if (room_entry.members && room_entry.members[current_user_id]) show_room(room_entry);
                    else unlock_page(room_entry);
                }, {
                    filter: function (arr) {
                        if (tabname == 'Global') return arr.filter(function (x) {
                            return !x.start_loc && !x.unlisted;
                        });
                        else if (tabname == 'Nearby') return arr.filter(function (r) {
                            if (!r.start_loc || r.unlisted) return false;
                            r.km_away = distance(r.start_loc[0], r.start_loc[1], curloc[0], curloc[1]);
                            return r.km_away < 20;
                        });
                        else return arr.filter(function (x) {
                            return !x.unlisted;
                        });
                    },
                    sort: function (arr) {
                        if (tabname == 'Nearby') return arr.sort(function (a,b) { return a.km_away - b.km_away; });
                        else return arr;
                    },
                    '.distance_and_direction': distance_to_room,
                    '.indicator': function (r) {
                        if (r.song_title) return "&#9834;";
                        else return "";
                    },
                    '.members_text': function (r) {
                        var count = Object.keys(r.members ||{}).length;
                        if (count > 1) return count + " members";
                        else return '';
                    }
                }],
            });
        }, default_tab || last_tab_in_rooms || 'Global']
    });
}



function link_room_to_room(r, link_to_room) {
    var msg = prompt('Please provide a message that will appear with the link:');
    if (!msg) show_room(r);
    fb('rooms/%/backlinks/%', link_to_room.id, r.id).set(r);
    fb('room_messages/%', r.id).push({
        author: current_user_id,
        author_name: short_name(),
        link: link_to_room.id,
        text: msg
    });
    show_room(r);
}


function player_view(el) {
    return function(state){
        if (state == 'playing') el.innerHTML = '<img src="/img/pause.png">';
        if (state == 'paused') el.innerHTML = '<img src="/img/play.png">';
        if (state == 'loading') el.innerHTML = '...';
        if (state == 'load_failed'){
            el.innerHTML = 'loading failed';
            alert('Loading the song failed.  Try exiting the room and reentering, or reloading the site.');
        }
    };
}

function unlock_summary(el) {
    return function(state){
        if (state == 'playing') el.innerHTML = 'Playing... you will enter the room momentarily.';
        if (state == 'paused') el.innerHTML = 'Paused...';
        if (state == 'loading') el.innerHTML = 'Loading the song...';
        if (state == 'load_failed') {
            el.innerHTML = 'loading failed';
            alert('Loading the song failed.  Try exiting the room and reentering, or reloading the site.');
        }
    };
}



function room_settings(r){
    var indicator = document.getElementById('room_settings_play');
    if (r.soundcloud_url) Player.stream('load', r.soundcloud_url, player_view(indicator));
    reveal('.page', 'room_settings', {
        '.player': r.song_title,
        room_settings_play: function(){
            if (Player.current.sound) return Player.current.sound.togglePause();
            else return alert('No current sound');
        },
        room_settings_rewind: function(){
            if (Player.current.sound) Player.current.sound.setPosition(0);
        },
        room_settings_next: function(){
            nextSong(r);
            hop_to_room(r.id, 'room_settings');
        },

        go_room: function(){ hop_to_room(r.id); },
        go_choose_song: function(){ choose_song(r); },
        room_attributes: [fb('rooms/%', r.id), {
            location: function(room){
                if (!room.start_loc) return "None yet.";
                else return room.start_loc[0] + ", " + room.start_loc[1];
            },
            location_toggle_class: function (room) {
                return room.start_loc ? 'toggle on' : 'toggle off';
            },
            riddle_toggle_class: function (room) {
                return room.riddle_q ? 'toggle on' : 'toggle off';
            },
            song_toggle_class: function (room) {
                return room.song_title ? 'toggle on' : 'toggle off';
            },
            visible_toggle_class: function (room) {
                return room.unlisted ? 'toggle off' : 'toggle on';
            }
        }],
        room_title_edit: fb('rooms/%/title', r.id),
        set_location_here: function(){
            if (r.start_loc){
                fb('rooms/%/start_loc', r.id).remove();
            } else {
                with_loc(function(loc){
                    fb('rooms/%', r.id).update({ start_loc: [loc.coords.latitude, loc.coords.longitude] });
                });
            }
        },
        set_riddle: function(){
            if (r.riddle_q) return fb('rooms/%/riddle_q', r.id).remove();
            var q = prompt('What question to you want answered?');
            if (!q) return;
            var a = prompt('What\'s the answer?');
            if (!a) return;
            fb('rooms/%', r.id).update({ riddle_q: q, riddle_a: a });
        },
        toggle_visibility: function () {
            fb('rooms/%', r.id).update({ unlisted: !r.unlisted });
        },
        commands: function () {
            var cmd = prompt("Command:");
            if (cmd == 'leave'){
                if (r.author == current_user_id) fb('rooms/%/author', r.id).remove();
                fb('rooms/%/members/%', r.id, current_user_id).remove();
                hop_to_room(r.id);
            }
            if (cmd == 'delete'){
                fb('rooms/%', r.id).remove();
                rooms();
            }
            if (cmd == 'll'){
                var ll = prompt('ll:');
                if (!ll) return;
                ll = ll.split(',');
                var lat = Number(ll[0]), lon = Number(ll[1]);
                fb('rooms/%', r.id).update({ start_loc: [lat, lon] });
            }
        }
    });
}




function choose_song(room){
    var search_results_updater;

    reveal('.page', 'choose_song', {
        go_room_settings: function(){ room_settings(room); },
        search_input: function(entry){
            SC.get('/tracks', { q: entry }, function(tracks) {
                document.getElementById('search_results').render(tracks);
            });
        },
        genres: [genres, function(clicked){
            SC.get('/tracks', { genres: clicked.name, order: 'hotness' }, function(tracks) {
                if (!tracks) return alert('no songs in that genre!');
                if (tracks.errors) { console.log(tracks);  return('attempt to fetch songs failed'); }

                playlist = shuffleArray(tracks);
                nextSong(room);
                hop_to_room(room.id, 'room_settings');
            });
        }],
        search_results: [[], function(clicked){
            // todo, play on search result click but don't set song
            fb('rooms/%', room.id).update(room_attributes_from_soundcloud_track(clicked));
            hop_to_room(room.id, 'room_settings');
        }]
    });
}


function backlinks(r){
    reveal('.page', 'room_backlinks', {
        go_backlinks_room: function () {
            show_room(r);
        },
        backlinks: [fb('rooms/%/backlinks', r.id), function(data){
            hop_to_room(data.id);
        }, {
            '.distance_and_direction': distance_to_room,
            '.indicator': function (r) {
                if (r.song_title) return "&#9834;";
                else return "";
            }
        }]
    });
}



function show_room(r){
    var indicator = document.getElementById('room_play');
    if (r.soundcloud_url) Player.stream('load', r.soundcloud_url, player_view(indicator));
    var reqs = compact([
        r.start_loc && '<img src="img/locate.png">',
        r.song_title && '<img src="img/note.png">',
        r.riddle_q && '<img src="img/puzzle.png">'
    ]);
    console.log('backlinks', r.backlinks||false);
    reveal('.page', 'show_room', {
        '.player': r.song_title,
        go_rooms: rooms,
        room_backlinks_div: [function () { backlinks(r); }, r.backlinks || false],
        room_backlinks_count: Object.keys(r.backlinks||{}).length,
        room_author_note: [function () { room_settings(r); }, r.author == current_user_id],
        room_play: function(){
            if (Player.current.sound) return Player.current.sound.togglePause();
            else return alert('No current sound');
        },
        room_song_title: r.song_title,
        room_rewind: function(){
            if (Player.current.sound) Player.current.sound.setPosition(0);
        },
        room_title: r.title || "New Room",
        room_requires: reqs[0] ? reqs.join('') : 'Public',
        edit_settings: function(){
            if (r.author == current_user_id) room_settings(r);
        },
        room_member_names: values(r.members).map(function (x) { return x.name; }).join(', '),
        room_messages: [fb('room_messages/%', r.id), function(msg){
            hop_to_room(msg.link);
        }, {
            '.action': function (msg) {
                if (msg.link) return "Follow link &raquo;";
                else return '';
            }
        }],
        message_add: function(entry){
            var msg = {
                author: current_user_id,
                author_name: short_name(),
                text: entry
            };
            if (Player.current.sound) msg.t = Player.current.sound.position / 1000;
            fb('room_messages/%', r.id).push(msg);
        },
        room_link: function () { rooms(r); }
    });
}





function unlock_page(r){
    var unlock_status_div = document.getElementById('unlock_status_div');
    if (r.soundcloud_url) Player.stream('load', r.soundcloud_url, unlock_summary(unlock_status_div));
    var remaining_requirements = [];
    var next_step;
    if (r.members && r.members[current_user_id]) show_room(r);
    if (r.author == current_user_id) return join_room(r);
    if (r.start_loc && !user_is_in_location_for_room(r)){
        if (!next_step) next_step = 'check_location';
        remaining_requirements.push('go to the right location');
    }
    if (r.riddle_q && !user_has_solved_riddle_for_room(r)){
        if (!next_step) next_step = 'answer_riddle';
        remaining_requirements.push('answer a riddle');
    }
    if (r.song_title){
        if (!next_step) next_step = 'play_song';
        remaining_requirements.push('listen to the song '+ r.song_title);
    }
    if (!next_step) return join_room(r);

    reveal('.page', 'unlock_page', {
        go_other_rooms: rooms,
        unlock_room_title: r.title || 'Unnamed Room',
        remaining_requirements: conjoin(remaining_requirements),
        button_label: next_step.replace('_', ' '),
        next_step_button: [function(){
            if (next_step == 'check_location'){
                with_loc(function(loc){
                    if (user_is_in_location_for_room(r)) unlock_page(r);
                    else alert('not close enough');
                });
            } else if (next_step == 'answer_riddle'){
                riddle_answer = prompt(r.riddle_q);
                if (user_has_solved_riddle_for_room(r)) unlock_page(r);
                else alert('Sorry, wrong answer.');
            } else if (next_step == 'play_song'){
                if (Player.current.sound) {
                    Player.current.sound.onPosition(10000, function () {
                        join_room(r);
                    });
                    Player.current.sound.togglePause();
                } else {
                    alert('play_sound but no current sound!');
                }
            }
        }, true]
    });
}





rooms();
